import { io as ioClient, type Socket } from "socket.io-client";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { getStoredPublicView } from "../../src/socket/public-view-store.js";
import { createTestServer, type TestServer } from "../helpers/testApp.js";
import {
  adminCookieHeaderFromAuthResponse,
  adminPassword,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";

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

async function connectAdmin(server: TestServer): Promise<{ socket: Socket; cookieHeader: string }> {
  const authRes = await request(server.app)
    .post("/api/admin/auth")
    .send({ login: "admin", password: adminPassword() });
  const cookieHeader = adminCookieHeaderFromAuthResponse(authRes);
  const socket = await connectSocket(server.baseUrl, cookieHeader);
  return { socket, cookieHeader };
}

describe("admin public view socket", () => {
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

  it("dedupes identical admin:results:view:set bursts (no view:set storm)", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("view-dedupe"));
    server = await createTestServer();
    const { socket: admin } = await connectAdmin(server);
    sockets.push(admin);

    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    await waitForEvent(admin, "results:public:view");

    let viewBroadcasts = 0;
    const onView = () => {
      viewBroadcasts += 1;
    };
    admin.on("results:public:view", onView);

    const payload = {
      quizId,
      mode: "question" as const,
      questionId: question.id,
      questionRevealStage: "options" as const,
      showFirstCorrectAnswerer: false,
    };

    for (let i = 0; i < 12; i++) {
      admin.emit("admin:results:view:set", payload);
    }
    await new Promise((r) => setTimeout(r, 500));

    admin.off("results:public:view", onView);
    expect(viewBroadcasts).toBe(1);

    const stored = await getStoredPublicView(quizId);
    expect(stored.mode).toBe("question");
    expect(stored.questionId).toBe(question.id);
  });

  it("accepts same view:set again after dedupe window", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(
      uniqueSlug("view-dedupe-gap"),
    );
    server = await createTestServer();
    const { socket: admin } = await connectAdmin(server);
    sockets.push(admin);

    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    await waitForEvent(admin, "results:public:view");

    const payload = {
      quizId,
      mode: "title" as const,
      showFirstCorrectAnswerer: false,
    };

    let viewBroadcasts = 0;
    const onView = () => {
      viewBroadcasts += 1;
    };
    admin.on("results:public:view", onView);

    admin.emit("admin:results:view:set", payload);
    await new Promise((r) => setTimeout(r, 200));
    expect(viewBroadcasts).toBe(1);

    admin.emit("admin:results:view:set", payload);
    await new Promise((r) => setTimeout(r, 200));
    expect(viewBroadcasts).toBe(1);

    await new Promise((r) => setTimeout(r, 300));
    admin.emit("admin:results:view:set", payload);
    await new Promise((r) => setTimeout(r, 200));
    expect(viewBroadcasts).toBe(2);

    admin.off("results:public:view", onView);
    expect((await getStoredPublicView(quizId)).mode).toBe("title");
  });

  it("applies distinct view:set modes without Forbidden", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("view-modes"));
    server = await createTestServer();
    const { socket: admin } = await connectAdmin(server);
    sockets.push(admin);

    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    await waitForEvent(admin, "results:public:view");

    const modes = [
      { mode: "title" as const, showFirstCorrectAnswerer: false },
      {
        mode: "question" as const,
        questionId: question.id,
        questionRevealStage: "options" as const,
        showFirstCorrectAnswerer: false,
      },
      { mode: "leaderboard" as const, showFirstCorrectAnswerer: false },
    ];

    for (const patch of modes) {
      admin.emit("admin:results:view:set", { quizId, ...patch });
      await new Promise((r) => setTimeout(r, 450));
    }

    const stored = await getStoredPublicView(quizId);
    expect(stored.mode).toBe("leaderboard");
  });

  it("does not broadcast when patch is player-only", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(
      uniqueSlug("view-player-only"),
    );
    server = await createTestServer();
    const { socket: admin } = await connectAdmin(server);
    const projector = await connectSocket(server.baseUrl);
    sockets.push(admin, projector);

    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    await waitForEvent(admin, "results:public:view");
    projector.emit("results:subscribe", { slug: eventName, viewer: "projector" });
    await waitForEvent(projector, "results:public:view");

    admin.emit("admin:results:view:set", {
      quizId,
      mode: "question",
      questionId: question.id,
      questionRevealStage: "options",
      showFirstCorrectAnswerer: false,
    });
    await waitForEvent(projector, "results:public:view");

    let projectorBroadcasts = 0;
    const onView = () => {
      projectorBroadcasts += 1;
    };
    projector.on("results:public:view", onView);

    admin.emit("admin:results:view:set", {
      quizId,
      speakerTileVisible: true,
      speakerTileText: "Спикеры",
      speakerQuestionsEnabled: true,
    });
    await new Promise((r) => setTimeout(r, 400));

    projector.off("results:public:view", onView);
    expect(projectorBroadcasts).toBe(0);

    const stored = await getStoredPublicView(quizId);
    expect(stored.speakerTileVisible).toBe(true);
    expect(stored.speakerTileText).toBe("Спикеры");
  });

  it("does not broadcast to projector when only reactions overlay changes in question mode", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(
      uniqueSlug("view-reactions-overlay"),
    );
    server = await createTestServer();
    const { socket: admin } = await connectAdmin(server);
    const projector = await connectSocket(server.baseUrl);
    sockets.push(admin, projector);

    admin.emit("results:subscribe", { slug: eventName, viewer: "admin" });
    await waitForEvent(admin, "results:public:view");
    projector.emit("results:subscribe", { slug: eventName, viewer: "projector" });
    await waitForEvent(projector, "results:public:view");

    admin.emit("admin:results:view:set", {
      quizId,
      mode: "question",
      questionId: question.id,
      questionRevealStage: "options",
      showFirstCorrectAnswerer: false,
    });
    await waitForEvent(projector, "results:public:view");

    let projectorBroadcasts = 0;
    const onView = () => {
      projectorBroadcasts += 1;
    };
    projector.on("results:public:view", onView);

    admin.emit("admin:results:view:set", {
      quizId,
      reactionsOverlayText: "Реакции в зале",
    });
    await new Promise((r) => setTimeout(r, 400));

    projector.off("results:public:view", onView);
    expect(projectorBroadcasts).toBe(0);

    const stored = await getStoredPublicView(quizId);
    expect(stored.reactionsOverlayText).toBe("Реакции в зале");
  });
});
