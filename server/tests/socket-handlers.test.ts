import { describe, expect, it, vi } from "vitest";
import { registerQuizAdminHandlers } from "../src/socket/handlers/quiz-admin.js";
import { registerSpeakerQuestionsHandlers } from "../src/socket/handlers/speaker-questions.js";
import type { EnrichedSocket } from "../src/socket/handler-common.js";

function createMockSocket(data: Partial<EnrichedSocket["data"]> = {}) {
  const listeners = new Map<string, (...args: unknown[]) => unknown>();
  return {
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

describe("socket handlers authorization", () => {
  it("blocks non-admin quiz commands with a socket error", async () => {
    const socket = createMockSocket({ isAdmin: false });
    const io = {} as any;
    registerQuizAdminHandlers(socket, io);

    const handler = socket._listeners.get("quiz:finish");
    expect(handler).toBeTypeOf("function");
    await handler?.({ quizId: "quiz-1" });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "FORBIDDEN", message: "Forbidden" }),
    );
  });

  it("blocks non-admin speaker settings updates", async () => {
    const socket = createMockSocket({ isAdmin: false });
    const io = {} as any;
    registerSpeakerQuestionsHandlers(socket, io);

    const handler = socket._listeners.get("admin:speaker:settings:set");
    expect(handler).toBeTypeOf("function");
    await handler?.({ quizId: "quiz-1" });

    expect(socket.emit).toHaveBeenCalledWith(
      "error:message",
      expect.objectContaining({ code: "FORBIDDEN", message: "Forbidden" }),
    );
  });
});
