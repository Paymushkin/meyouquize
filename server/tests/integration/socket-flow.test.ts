import { io as ioClient, type Socket } from "socket.io-client";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createTestServer, type TestServer } from "../helpers/testApp.js";
import {
  adminCookieHeaderFromAuthResponse,
  adminPassword,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";
import { setQuestionEnabled } from "../../src/quiz-service.js";

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

describe("socket integration", () => {
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

  it("player joins and submits an answer", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("sock-player"));
    await setQuestionEnabled(quizId, question.id, true);
    const correctId = question.options.find((o) => o.isCorrect)!.id;

    server = await createTestServer();
    const player = await connectSocket(server.baseUrl);
    sockets.push(player);

    player.emit("quiz:join", { slug: eventName, nickname: "SocketPlayer", deviceId: "sock-dev-1" });
    await waitForEvent<{ ok: boolean }>(player, "quiz:joined");

    const submittedPromise = waitForEvent<{ ok: boolean }>(player, "answer:submitted");
    const scorePromise = waitForEvent<{ myTotalScore: number }>(player, "player:quiz-score");
    player.emit("answer:submit", {
      quizId,
      questionId: question.id,
      optionIds: [correctId],
    });
    await submittedPromise;
    const scorePayload = await scorePromise;
    expect(scorePayload.myTotalScore).toBe(10);
  });

  it("admin activates question via socket", async () => {
    const { quizId, subQuizId, question } = await seedSingleChoiceQuiz(uniqueSlug("sock-admin"));
    server = await createTestServer();

    const authRes = await request(server.app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);

    const admin = await connectSocket(server.baseUrl, cookieHeader);
    sockets.push(admin);

    admin.emit("question:activate", { quizId, subQuizId });
    await new Promise((r) => setTimeout(r, 300));

    const stateRes = await request(server.app).get(`/api/quiz/${quizId}/state`);
    expect(stateRes.body.activeQuestion?.id).toBe(question.id);
  });

  it("blocks admin command without session cookie", async () => {
    const { quizId, subQuizId } = await seedSingleChoiceQuiz(uniqueSlug("sock-forbidden"));
    server = await createTestServer();
    const guest = await connectSocket(server.baseUrl);
    sockets.push(guest);

    guest.emit("question:activate", { quizId, subQuizId });
    const err = await waitForEvent<{ code: string; message: string }>(guest, "error:message");
    expect(err.code).toBe("FORBIDDEN");
  });

  it("reports online player count to admin dashboard", async () => {
    const { eventName } = await seedSingleChoiceQuiz(uniqueSlug("sock-online"));
    server = await createTestServer();

    const authRes = await request(server.app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);

    const player = await connectSocket(server.baseUrl);
    sockets.push(player);
    player.emit("quiz:join", {
      slug: eventName,
      nickname: "OnlinePlayer",
      deviceId: "online-dev-1",
    });
    await waitForEvent<{ ok: boolean }>(player, "quiz:joined");

    const admin = await connectSocket(server.baseUrl, cookieHeader);
    sockets.push(admin);

    const countPromise = waitForEvent<{ count: number }>(admin, "quiz:online:count");
    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    const countPayload = await countPromise;
    expect(countPayload.count).toBe(1);
  });
});
