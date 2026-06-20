import { io as ioClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { createTestServer, type TestServer } from "../helpers/testApp.js";
import { prisma } from "../../src/prisma.js";
import { saveStoredPublicView } from "../../src/socket/public-view-store.js";
import { joinPlayer, seedSingleChoiceQuiz, uniqueSlug } from "../helpers/integrationFixtures.js";

type SpeakerQuestionsUpdate = {
  items: Array<{ id: string; text: string; isMine?: boolean; userVisible?: boolean }>;
};

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

async function connectSocket(baseUrl: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { transports: ["websocket"] });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });
}

async function enableSpeakerQuestions(quizId: string) {
  await saveStoredPublicView(quizId, {
    ...DEFAULT_PUBLIC_VIEW_STATE,
    speakerQuestionsEnabled: true,
    speakerTileVisible: true,
    speakerQuestionsSpeakers: ["Иванов"],
  });
}

async function joinPlayerSocket(
  baseUrl: string,
  slug: string,
  nickname: string,
  deviceId: string,
): Promise<Socket> {
  await joinPlayer(slug, nickname, deviceId);
  const socket = await connectSocket(baseUrl);
  socket.emit("quiz:join", { slug, nickname, deviceId });
  await waitForEvent<{ ok: boolean }>(socket, "quiz:joined");
  return socket;
}

describe("speaker questions integration", () => {
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

  it("player deletes own speaker question", async () => {
    const { eventName, quizId } = await seedSingleChoiceQuiz(uniqueSlug("speaker-del"));
    await enableSpeakerQuestions(quizId);
    server = await createTestServer();

    const player = await joinPlayerSocket(server.baseUrl, eventName, "Speaker Author", "dev-sp-1");
    sockets.push(player);

    player.emit("speaker:question:create", {
      quizId,
      speakerName: "Все спикеры",
      text: "Можно удалить этот вопрос?",
    });
    const afterCreate = await waitForEvent<SpeakerQuestionsUpdate>(
      player,
      "speaker:questions:update",
    );
    const questionId = afterCreate.items.find((item) => item.isMine)?.id;
    expect(questionId).toBeTruthy();

    player.emit("speaker:question:delete", { quizId, speakerQuestionId: questionId });
    const afterDelete = await waitForEvent<SpeakerQuestionsUpdate>(
      player,
      "speaker:questions:update",
    );
    expect(afterDelete.items.some((item) => item.id === questionId)).toBe(false);

    const count = await prisma.speakerQuestion.count({ where: { quizId } });
    expect(count).toBe(0);
  });

  it("player cannot delete another participant question", async () => {
    const { eventName, quizId } = await seedSingleChoiceQuiz(uniqueSlug("speaker-del-forbidden"));
    await enableSpeakerQuestions(quizId);
    server = await createTestServer();

    const author = await joinPlayerSocket(server.baseUrl, eventName, "Author One", "dev-sp-author");
    sockets.push(author);
    author.emit("speaker:question:create", {
      quizId,
      speakerName: "Все спикеры",
      text: "Чужой вопрос для проверки",
    });
    const authorPayload = await waitForEvent<SpeakerQuestionsUpdate>(
      author,
      "speaker:questions:update",
    );
    const foreignId = authorPayload.items.find((item) => item.isMine)?.id;
    expect(foreignId).toBeTruthy();

    const other = await joinPlayerSocket(server.baseUrl, eventName, "Other Player", "dev-sp-other");
    sockets.push(other);

    const errorPromise = waitForEvent<{ message: string }>(other, "error:message");
    other.emit("speaker:question:delete", { quizId, speakerQuestionId: foreignId! });
    const errorPayload = await errorPromise;
    expect(errorPayload.message).toMatch(/свой вопрос/i);

    const count = await prisma.speakerQuestion.count({ where: { id: foreignId! } });
    expect(count).toBe(1);
  });
});
