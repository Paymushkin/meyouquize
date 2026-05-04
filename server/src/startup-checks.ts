import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { normalizePublicViewState } from "@meyouquize/shared";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

type MigrationRow = {
  migration_name: string;
};

export async function ensureMigrationsAppliedOrThrow() {
  const currentFile = fileURLToPath(import.meta.url);
  const serverSrcDir = path.dirname(currentFile);
  const migrationsDir = path.resolve(serverSrcDir, "../prisma/migrations");
  const localMigrationNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  // Читаем `_prisma_migrations` только по прямому URL (как `migrate deploy`), не через PgBouncer:
  // иначе при `DATABASE_URL` на пулер возможны расхождения auth/параметров с systemd.
  const directPrisma = new PrismaClient({
    datasources: { db: { url: env.directDatabaseUrl } },
  });
  let appliedRows: MigrationRow[];
  try {
    appliedRows = await directPrisma.$queryRawUnsafe<MigrationRow[]>(
      "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name ASC",
    );
  } finally {
    await directPrisma.$disconnect();
  }
  const appliedSet = new Set(appliedRows.map((row) => row.migration_name));
  const missing = localMigrationNames.filter((name) => !appliedSet.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Database migrations are not fully applied. Missing: ${missing.join(", ")}. Run prisma migrate deploy before starting the server.`,
    );
  }
}

export async function resetProjectorViewOnStartup() {
  const rows = await prisma.quiz.findMany({
    select: { id: true, publicView: true },
  });
  for (const row of rows) {
    const rawView =
      row.publicView && typeof row.publicView === "object" && !Array.isArray(row.publicView)
        ? row.publicView
        : {};
    const normalized = normalizePublicViewState(rawView);
    if (normalized.mode === "title" && normalized.questionId === undefined) continue;
    await prisma.quiz.update({
      where: { id: row.id },
      data: {
        publicView: {
          ...normalized,
          mode: "title",
          questionId: undefined,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
