import { io as ioClient, type Socket } from "socket.io-client";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRoom,
  getQuizPublicState,
  getRoomByEventName,
  replaceRoomContent,
  setQuestionEnabled,
} from "../../src/quiz-service.js";
import {
  adminCookieHeaderFromAuthResponse,
  adminPassword,
  seedStandaloneVoteRoom,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";
import { createTestServer, type TestServer } from "../helpers/testApp.js";

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.once("error:message", (err: { message?: string }) => {
      clearTimeout(timer);
      reject(new Error(err?.message ?? "Socket error"));
    });
  });
}

async function connectSocket(baseUrl: string, cookieHeader?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, {
      transports: ["websocket"],
      extraHeaders: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });
}

describe("room multi-vote", () => {
  let server: TestServer | null = null;
  const sockets: Socket[] = [];

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
    if (server) {
      await server.close();
      server = null;
    }
  });

  it("keeps several standalone votes active; queue is LIFO by activation time", async () => {
    const { eventName, quizId, questions } = await seedStandaloneVoteRoom(3);
    const [voteA, voteB, voteC] = questions;

    await setQuestionEnabled(quizId, voteA!.id, true);
    await setQuestionEnabled(quizId, voteB!.id, true);
    const state = await setQuestionEnabled(quizId, voteC!.id, true);

    expect(state?.quizProgress).toBeNull();
    expect(state?.activeQuestions?.map((q) => q.id)).toEqual([voteC!.id, voteB!.id, voteA!.id]);
    expect(state?.activeQuestion?.id).toBe(voteC!.id);

    const room = await getRoomByEventName(eventName);
    const activeIds = new Set(room!.questions.filter((q) => q.isActive).map((q) => q.id));
    expect(activeIds).toEqual(new Set([voteA!.id, voteB!.id, voteC!.id]));

    await setQuestionEnabled(quizId, voteB!.id, false);
    const afterOff = await getQuizPublicState(quizId);
    expect(afterOff?.activeQuestions?.map((q) => q.id)).toEqual([voteC!.id, voteA!.id]);
  });

  it("re-activating a vote moves it to the front of the player queue", async () => {
    const { quizId, questions } = await seedStandaloneVoteRoom(2);
    const [voteA, voteB] = questions;

    await setQuestionEnabled(quizId, voteA!.id, true);
    await setQuestionEnabled(quizId, voteB!.id, true);
    const afterB = await getQuizPublicState(quizId);
    expect(afterB?.activeQuestions?.map((q) => q.id)).toEqual([voteB!.id, voteA!.id]);

    const afterAAgain = await setQuestionEnabled(quizId, voteA!.id, true);
    expect(afterAAgain?.activeQuestions?.map((q) => q.id)).toEqual([voteA!.id, voteB!.id]);
  });

  it("enabling sub-quiz vote deactivates standalone votes in the same room", async () => {
    const slug = uniqueSlug("sub-vs-room");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz block",
          sortOrder: 0,
          questions: [
            {
              text: "Sub-quiz Q1",
              type: "single",
              points: 1,
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [
        {
          text: "Room vote",
          type: "single",
          points: 0,
          scoringMode: "poll",
          options: [
            { text: "Yes", isCorrect: false },
            { text: "No", isCorrect: false },
          ],
        },
      ],
    });
    const room = await getRoomByEventName(slug);
    const standalone = room!.questions.find((q) => q.subQuizId == null)!;
    const subQuizQuestion = room!.questions.find((q) => q.subQuizId != null)!;

    await setQuestionEnabled(room!.id, standalone.id, true);
    let state = await getQuizPublicState(room!.id);
    expect(state?.activeQuestions?.map((q) => q.id)).toEqual([standalone.id]);

    await setQuestionEnabled(room!.id, subQuizQuestion.id, true);
    state = await getQuizPublicState(room!.id);
    expect(state?.activeQuestions?.map((q) => q.id)).toEqual([subQuizQuestion.id]);
    expect(state?.activeQuestion?.id).toBe(subQuizQuestion.id);

    const refreshed = await getRoomByEventName(slug);
    expect(refreshed!.questions.find((q) => q.id === standalone.id)?.isActive).toBe(false);
  });

  it("player submits to open room votes in LIFO order via socket", async () => {
    const { eventName, quizId, questions } = await seedStandaloneVoteRoom(3);
    const [voteA, voteB, voteC] = questions;

    await setQuestionEnabled(quizId, voteA!.id, true);
    await setQuestionEnabled(quizId, voteB!.id, true);
    await setQuestionEnabled(quizId, voteC!.id, true);

    server = await createTestServer();

    const stateRes = await request(server.app).get(`/api/quiz/${quizId}/state`);
    expect(stateRes.body.activeQuestions.map((q: { id: string }) => q.id)).toEqual([
      voteC!.id,
      voteB!.id,
      voteA!.id,
    ]);

    const player = await connectSocket(server.baseUrl);
    sockets.push(player);
    player.emit("quiz:join", {
      slug: eventName,
      nickname: "QueuePlayer",
      deviceId: "queue-dev-1",
    });
    await waitForEvent<{ ok: boolean }>(player, "quiz:joined");

    const queue = [voteC!, voteB!, voteA!];
    for (const question of queue) {
      const optionId = question!.options[0]!.id;
      const submittedPromise = waitForEvent<{ ok: boolean }>(player, "answer:submitted");
      player.emit("answer:submit", {
        quizId,
        questionId: question!.id,
        optionIds: [optionId],
      });
      await submittedPromise;
    }
  });

  it("admin can enable multiple room votes via socket without disabling previous", async () => {
    const { quizId, questions } = await seedStandaloneVoteRoom(3);
    const [voteA, voteB, voteC] = questions;

    server = await createTestServer();
    const authRes = await request(server.app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);
    const admin = await connectSocket(server.baseUrl, cookieHeader);
    sockets.push(admin);

    for (const vote of [voteA, voteB, voteC]) {
      admin.emit("question:toggle", { quizId, questionId: vote!.id, enabled: true });
      await new Promise((r) => setTimeout(r, 80));
    }

    const state = await getQuizPublicState(quizId);
    expect(state?.activeQuestions?.map((q) => q.id)).toEqual([voteC!.id, voteB!.id, voteA!.id]);
  });
});
