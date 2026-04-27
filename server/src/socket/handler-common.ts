import type { Socket } from "socket.io";

export type SocketData = {
  participantId?: string;
  quizId?: string;
  isAdmin?: boolean;
  speakerViewer?: "player" | "projector" | "admin";
};

export type EnrichedSocket = Socket & { data: SocketData };

export type SocketErrorCode =
  | "FORBIDDEN"
  | "NOT_JOINED"
  | "ALREADY_ANSWERED"
  | "NOT_FOUND"
  | "INVALID_PAYLOAD"
  | "RATE_LIMITED"
  | "INTERNAL";

export type SocketErrorPayload = {
  code: SocketErrorCode;
  message: string;
  details?: unknown;
};

function inferSocketErrorCode(message: string): SocketErrorCode {
  if (message === "Forbidden") return "FORBIDDEN";
  if (message === "Not joined") return "NOT_JOINED";
  if (message === "Already answered this question") return "ALREADY_ANSWERED";
  if (message === "Question not found" || message === "Quiz not found") return "NOT_FOUND";
  if (message.toLowerCase().includes("payload")) return "INVALID_PAYLOAD";
  if (message.toLowerCase().includes("too many")) return "RATE_LIMITED";
  return "INTERNAL";
}

export function fail(socket: Socket, error: string | Partial<SocketErrorPayload>) {
  const payload: SocketErrorPayload =
    typeof error === "string"
      ? {
          code: inferSocketErrorCode(error),
          message: error,
        }
      : {
          code: error.code ?? inferSocketErrorCode(error.message ?? "Internal error"),
          message: error.message ?? "Internal error",
          details: error.details,
        };
  socket.emit("error:message", payload);
}
