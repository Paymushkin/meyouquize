import type { Express } from "express";
import request from "supertest";
import {
  createRoom,
  getRoomByEventName,
  joinQuiz,
  replaceRoomContent,
  setQuestionEnabled,
} from "../../src/quiz-service.js";

export function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function seedSingleChoiceQuiz(slug?: string) {
  const eventName = slug ?? uniqueSlug("quiz");
  await createRoom({ eventName, title: `Room ${eventName}` });
  await replaceRoomContent(eventName, {
    subQuizzes: [
      {
        title: "Block 1",
        sortOrder: 0,
        questions: [
          {
            text: "Pick one",
            type: "single",
            points: 10,
            scoringMode: "quiz",
            options: [
              { text: "Correct", isCorrect: true },
              { text: "Wrong", isCorrect: false },
            ],
          },
        ],
      },
    ],
    standaloneQuestions: [],
  });
  const room = await getRoomByEventName(eventName);
  if (!room) throw new Error("Room not found after seed");
  const subQuiz = room.subQuizzes[0];
  const question = room.questions[0];
  if (!subQuiz || !question) throw new Error("Expected subQuiz and question");
  return { eventName, quizId: room.id, subQuizId: subQuiz.id, question, room };
}

export async function seedStandaloneVoteRoom(voteCount = 3, slug?: string) {
  const eventName = slug ?? uniqueSlug("room-votes");
  await createRoom({ eventName, title: `Room ${eventName}` });
  await replaceRoomContent(eventName, {
    subQuizzes: [],
    standaloneQuestions: Array.from({ length: voteCount }, (_, index) => ({
      text: `Vote ${index + 1}`,
      type: "single" as const,
      points: 0,
      scoringMode: "poll" as const,
      options: [
        { text: "Option A", isCorrect: false },
        { text: "Option B", isCorrect: false },
      ],
    })),
  });
  const room = await getRoomByEventName(eventName);
  if (!room) throw new Error("Room not found after seed");
  const questions = room.questions.filter((q) => q.subQuizId == null);
  if (questions.length !== voteCount) {
    throw new Error(`Expected ${voteCount} standalone questions`);
  }
  return { eventName, quizId: room.id, questions, room };
}

export async function activateQuestion(quizId: string, questionId: string) {
  await setQuestionEnabled(quizId, questionId, true);
}

export async function joinPlayer(slug: string, nickname: string, deviceId: string) {
  return joinQuiz({ slug, nickname, deviceId });
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "test-admin-password";
}

export async function createAdminAgent(app: Express) {
  const agent = request.agent(app);
  await agent
    .post("/api/admin/auth")
    .send({ login: process.env.ADMIN_LOGIN ?? "admin", password: adminPassword() })
    .expect(200);
  return agent;
}

export function adminCookieHeaderFromAuthResponse(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  if (!raw) throw new Error("Expected set-cookie from admin auth");
  const cookies = Array.isArray(raw) ? raw : [raw];
  const mqAdmin = cookies.find((c) => c.startsWith("mq_admin="));
  if (!mqAdmin) throw new Error("Expected mq_admin cookie");
  return mqAdmin.split(";")[0]!;
}
