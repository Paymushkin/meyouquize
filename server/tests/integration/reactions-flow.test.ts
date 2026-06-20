import { io as ioClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createTestServer, type TestServer } from "../helpers/testApp.js";
import {
  adminCookieHeaderFromAuthResponse,
  adminPassword,
  joinPlayer,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";
import request from "supertest";

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

describe("reactions integration", () => {
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

  it("admin starts reactions and player toggles emoji", async () => {
    const { eventName, quizId } = await seedSingleChoiceQuiz(uniqueSlug("reactions"));
    const joined = await joinPlayer(eventName, "Reaction Player", "dev-reaction");
    server = await createTestServer();

    const authRes = await request(server.app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);
    const admin = await connectSocket(server.baseUrl, cookieHeader);
    sockets.push(admin);

    admin.emit("reactions:start", {
      quizId,
      durationSec: 30,
      reactions: ["👍", "🔥"],
    });
    await new Promise((r) => setTimeout(r, 200));

    const player = await connectSocket(server.baseUrl);
    sockets.push(player);
    player.emit("quiz:join", {
      slug: eventName,
      nickname: "Reaction Player",
      deviceId: "dev-reaction",
    });
    await waitForEvent<{ ok: boolean }>(player, "quiz:joined");

    player.emit("reaction:toggle", { quizId, reactionType: "👍" });
    await new Promise((r) => setTimeout(r, 300));

    const stateRes = await request(server.app).get(`/api/quiz/${quizId}/state`);
    expect(stateRes.body.reactionSession?.counts["👍"]).toBeGreaterThanOrEqual(1);
    expect(joined.participantId).toBeTruthy();
  });

  it("admin stops reactions session", async () => {
    const { quizId } = await seedSingleChoiceQuiz(uniqueSlug("reactions-stop"));
    server = await createTestServer();
    const authRes = await request(server.app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);
    const admin = await connectSocket(server.baseUrl, cookieHeader);
    sockets.push(admin);

    admin.emit("reactions:start", { quizId, durationSec: 20, reactions: ["👏"] });
    await new Promise((r) => setTimeout(r, 150));
    admin.emit("reactions:stop", { quizId });
    await new Promise((r) => setTimeout(r, 150));

    const stateRes = await request(server.app).get(`/api/quiz/${quizId}/state`);
    expect(stateRes.body.reactionSession?.isActive).toBe(false);
  });
});
