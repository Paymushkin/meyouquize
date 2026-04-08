import type { Socket } from "socket.io";

export type SocketData = {
  participantId?: string;
  quizId?: string;
  isAdmin?: boolean;
};

export type EnrichedSocket = Socket & { data: SocketData };

export function fail(socket: Socket, message: string) {
  socket.emit("error:message", { message });
}
