import { describe, expect, it, vi } from "vitest";
import type { EnrichedSocket } from "../src/socket/handler-common.js";
import { registerQuizPlayHandlers } from "../src/socket/handlers/quiz-play.js";
import { registerFeedbackHandlers } from "../src/socket/handlers/feedback.js";
import { registerSpeakerQuestionsHandlers } from "../src/socket/handlers/speaker-questions.js";

function createMockSocket(
  id: string,
  data: Partial<EnrichedSocket["data"]> = {},
): EnrichedSocket & { _listeners: Map<string, (...args: unknown[]) => unknown> } {
  const listeners = new Map<string, (...args: unknown[]) => unknown>();
  return {
    id,
    data: {
      participantId: undefined,
      quizId: undefined,
      isAdmin: false,
      speakerViewer: "player",
      ...data,
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
      listeners.set(event, cb);
    }),
    emit: vi.fn(),
    join: vi.fn(),
    _listeners: listeners,
  } as unknown as EnrichedSocket & { _listeners: Map<string, (...args: unknown[]) => unknown> };
}

describe("player socket authorization: cross-quiz protection", () => {
  it("blocks reaction:toggle when socket.quizId != payload.quizId", async () => {
    const socket = createMockSocket("s-rx", { participantId: "p1", quizId: "quiz-a" });
    const io = {} as any;
    registerQuizPlayHandlers(socket, io);

    const handler = socket._listeners.get("reaction:toggle");
    await handler?.({ quizId: "quiz-b", reactionType: "👍" });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "NOT_JOINED", message: "Not joined" }),
    );
  });

  it("blocks answers:reset when socket.quizId != payload.quizId", async () => {
    const socket = createMockSocket("s-reset", { participantId: "p1", quizId: "quiz-a" });
    const io = {} as any;
    registerQuizPlayHandlers(socket, io);

    const handler = socket._listeners.get("answers:reset");
    await handler?.({ quizId: "quiz-b" });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "NOT_JOINED", message: "Not joined" }),
    );
  });

  it("blocks feedback:submit when socket.quizId != payload.quizId", async () => {
    const socket = createMockSocket("s-fb", { participantId: "p1", quizId: "quiz-a" });
    const io = {} as any;
    registerFeedbackHandlers(socket, io);

    const handler = socket._listeners.get("feedback:submit");
    await handler?.({ quizId: "quiz-b", scaleAnswers: {} });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "NOT_JOINED", message: "Not joined" }),
    );
  });

  it("blocks speaker:question:create when socket.quizId != payload.quizId", async () => {
    const socket = createMockSocket("s-speaker", { participantId: "p1", quizId: "quiz-a" });
    const io = {} as any;
    registerSpeakerQuestionsHandlers(socket, io);

    const handler = socket._listeners.get("speaker:question:create");
    await handler?.({ quizId: "quiz-b", speakerName: "Alice", text: "Hello world" });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "NOT_JOINED", message: "Not joined" }),
    );
  });
});
