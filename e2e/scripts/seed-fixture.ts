import fs from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { E2eFixture } from "../helpers/fixture.js";
import { readE2eFixture } from "../helpers/fixture.js";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(e2eRoot, ".fixture-state.json");

function ensureTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE = "1";
  process.env.APP_NETWORK_MODE = process.env.APP_NETWORK_MODE ?? "lan";
  process.env.LOCAL_ADMIN_NO_AUTH = "0";
  process.env.CLUSTER_WORKERS = "1";
  const login = process.env.ADMIN_LOGIN?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD?.trim() || "test-admin-password";
  process.env.ADMIN_LOGIN = login;
  process.env.ADMIN_PASSWORD = password;
  process.env.ADMIN_ACCOUNTS = JSON.stringify([{ login, password }]);
  delete process.env.ADMIN_ACCOUNTS_BASE64;

  const defaultTestUrl = "postgresql://postgres:postgres@127.0.0.1:5432/meyouquize_test";
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const looksLikeTestDb = dbUrl.includes("meyouquize_test") || /[_-]test([/?]|$)/i.test(dbUrl);
  process.env.DATABASE_URL = looksLikeTestDb ? dbUrl : defaultTestUrl;
  process.env.DIRECT_URL = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL;

  if (!process.env.MEDIA_DIR?.trim()) {
    const runId = process.env.E2E_RUN_ID ?? `run-${Date.now()}`;
    process.env.E2E_RUN_ID = runId;
    process.env.MEDIA_DIR = path.join(os.tmpdir(), `meyouquize-e2e-${runId}`, "media");
  }
  fs.mkdirSync(process.env.MEDIA_DIR, { recursive: true });
}

export type { E2eFixture } from "../helpers/fixture.js";
export { readE2eFixture } from "../helpers/fixture.js";

export async function seedE2eFixture(): Promise<E2eFixture> {
  ensureTestEnv();
  const runId = process.env.E2E_RUN_ID!;
  const slug = `e2e-${runId}`;

  const { initTestDatabase, resetTestDatabase, shutdownTestDatabase } =
    await import("../../server/tests/helpers/testDb.js");
  const { createRoom, getRoomByEventName, replaceRoomContent } =
    await import("../../server/src/quiz-service.js");
  const { createFeedbackForm } = await import("../../server/src/feedback-service.js");

  await initTestDatabase();
  await resetTestDatabase();

  await createRoom({ eventName: slug, title: `E2E Room ${runId}` });
  await replaceRoomContent(slug, {
    subQuizzes: [
      {
        title: "E2E Квиз",
        sortOrder: 0,
        questionFlowMode: "manual",
        questions: [
          {
            text: "E2E: выберите один",
            type: "single",
            points: 10,
            scoringMode: "quiz",
            options: [
              { text: "Вариант А", isCorrect: true },
              { text: "Вариант Б", isCorrect: false },
            ],
          },
          {
            text: "E2E: облако тегов",
            type: "tag_cloud",
            points: 5,
            maxAnswers: 3,
            scoringMode: "quiz",
            options: [{ text: "тег-эталон", isCorrect: true }],
          },
          {
            text: "E2E: ранжирование",
            type: "ranking",
            points: 5,
            scoringMode: "quiz",
            options: [
              { text: "Лучший", isCorrect: false },
              { text: "Худший", isCorrect: false },
            ],
          },
        ],
      },
    ],
    standaloneQuestions: [
      {
        text: "E2E: голосование",
        type: "single",
        points: 0,
        scoringMode: "poll",
        options: [
          { text: "Да", isCorrect: false },
          { text: "Нет", isCorrect: false },
        ],
      },
    ],
  });

  const room = await getRoomByEventName(slug);
  if (!room) throw new Error("Failed to seed E2E room");

  const subQuiz = room.subQuizzes[0];
  const single = room.questions.find((q) => q.text.includes("выберите один"));
  const tag = room.questions.find((q) => q.type === "TAG_CLOUD");
  const ranking = room.questions.find((q) => q.type === "RANKING");
  const vote = room.questions.find((q) => q.subQuizId == null);

  if (!subQuiz || !single || !tag || !ranking || !vote) {
    throw new Error("E2E seed missing expected questions");
  }

  const correctOption = single.options.find((o) => o.isCorrect);
  if (!correctOption) throw new Error("E2E seed missing correct option");

  const feedback = await createFeedbackForm(room.id, {
    title: "E2E Feedback",
    scales: [
      {
        id: randomUUID(),
        label: "Как вам?",
        options: ["1", "2", "3", "4", "5"],
      },
    ],
    commentEnabled: false,
    commentPlaceholder: "",
  });

  const { saveStoredPublicView } = await import("../../server/src/socket/public-view-store.js");
  const sharedMod = await import(
    pathToFileURL(path.resolve(e2eRoot, "../shared/src/index.ts")).href
  );
  const defaultPublicView = sharedMod.DEFAULT_PUBLIC_VIEW_STATE as Record<string, unknown>;
  await saveStoredPublicView(room.id, {
    ...defaultPublicView,
    playerVisibleResultQuestionIds: [vote.id],
  } as never);

  const fixture: E2eFixture = {
    runId,
    slug,
    title: room.title,
    quizId: room.id,
    subQuizId: subQuiz.id,
    singleQuestionId: single.id,
    singleCorrectOptionId: correctOption.id,
    voteQuestionId: vote.id,
    tagQuestionId: tag.id,
    rankingQuestionId: ranking.id,
    rankingOptionIds: ranking.options.map((o) => o.id),
    feedbackFormId: feedback.id,
    mediaDir: process.env.MEDIA_DIR!,
  };

  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  const verifyRoom = await getRoomByEventName(slug);
  if (!verifyRoom) {
    throw new Error(`E2E seed verification failed: room "${slug}" missing in DATABASE_URL`);
  }

  await shutdownTestDatabase();
  return fixture;
}

export async function teardownE2eFixture(): Promise<void> {
  if (!fs.existsSync(fixturePath)) return;
  const fixture = readE2eFixture();
  ensureTestEnv();
  process.env.MEDIA_DIR = fixture.mediaDir;

  try {
    const { initTestDatabase, resetTestDatabase, shutdownTestDatabase } =
      await import("../../server/tests/helpers/testDb.js");
    await initTestDatabase();
    await resetTestDatabase();
    await shutdownTestDatabase();
  } finally {
    fs.rmSync(path.dirname(fixture.mediaDir), { recursive: true, force: true });
    fs.rmSync(fixturePath, { force: true });
  }
}
