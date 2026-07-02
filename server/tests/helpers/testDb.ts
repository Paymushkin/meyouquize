import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient, Quiz } from "@prisma/client";
import { assertTestMediaDir } from "./testStorage.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let prisma: PrismaClient | null = null;

/** Сериализует TRUNCATE между воркерами (защита от deadlock при параллельном запуске). */
const TEST_DB_RESET_LOCK_KEY = 42424242;

function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid-url>";
  }
}

export function assertTestEnvironment(): void {
  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE = process.env.TEST_DATABASE ?? "1";
  process.env.APP_NETWORK_MODE = process.env.APP_NETWORK_MODE ?? "internet";
  process.env.LOCAL_ADMIN_NO_AUTH = process.env.LOCAL_ADMIN_NO_AUTH ?? "0";
  process.env.CLUSTER_WORKERS = "1";

  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!dbUrl) {
    throw new Error(
      "Integration tests require DATABASE_URL (copy .env.test.example → .env.test or set in CI)",
    );
  }
  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = dbUrl;
  }

  const looksLikeTestDb =
    process.env.TEST_DATABASE === "1" &&
    (dbUrl.includes("meyouquize_test") || /[_-]test([/?]|$)/i.test(dbUrl));
  if (!looksLikeTestDb) {
    throw new Error(
      `Refusing integration tests against non-test DATABASE_URL: ${sanitizeDatabaseUrl(dbUrl)}`,
    );
  }

  assertTestMediaDir();
}

export async function initTestDatabase(): Promise<void> {
  assertTestEnvironment();
  execSync("npx prisma migrate deploy", {
    cwd: serverRoot,
    env: process.env,
    stdio: "pipe",
  });
  const mod = await import("../../src/prisma.js");
  prisma = mod.prisma;
  await resetTestDatabase();
}

export async function resetTestDatabase(): Promise<void> {
  const client = prisma ?? (await import("../../src/prisma.js")).prisma;
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${TEST_DB_RESET_LOCK_KEY})`);
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        "FeedbackResponse",
        "FeedbackForm",
        "AdminSession",
        "SpeakerQuestionReaction",
        "SpeakerQuestion",
        "Answer",
        "Option",
        "Question",
        "Participant",
        "SubQuiz",
        "Quiz"
      RESTART IDENTITY CASCADE;
    `);
  });
}

export async function shutdownTestDatabase(): Promise<void> {
  if (!prisma) return;
  await prisma.$disconnect();
  prisma = null;
}

export async function seedMinimalRoom(overrides?: {
  slug?: string;
  title?: string;
}): Promise<Quiz> {
  const client = prisma ?? (await import("../../src/prisma.js")).prisma;
  const slug = overrides?.slug ?? `test-${Date.now()}`;
  return client.quiz.create({
    data: {
      title: overrides?.title ?? "Test Room",
      slug,
      accessToken: `tok-${slug}`,
      status: "DRAFT",
    },
  });
}
