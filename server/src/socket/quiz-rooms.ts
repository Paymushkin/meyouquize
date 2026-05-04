import type { Server } from "socket.io";
import { env } from "../env.js";

/** Игроки: состояние квиза, очистка ответов (лёгкие события). */
export function quizPlayerRoom(quizId: string) {
  return `quiz:${quizId}`;
}

/** Экран результатов и админ-проектор: агрегаты и public view. */
export function quizDashboardRoom(quizId: string) {
  return `quiz:${quizId}:dashboard`;
}

export function emitToQuizPlayers(io: Server, quizId: string, event: string, payload?: unknown) {
  const r = io.to(quizPlayerRoom(quizId));
  if (payload === undefined) r.emit(event);
  else r.emit(event, payload);
}

export function emitToQuizDashboard(io: Server, quizId: string, event: string, payload?: unknown) {
  const r = io.to(quizDashboardRoom(quizId));
  if (payload === undefined) r.emit(event);
  else r.emit(event, payload);
}

/** События, которые должны получать и игроки, и подписчики дашборда (отдельные комнаты). */
export function emitToQuizPlayersAndDashboard(
  io: Server,
  quizId: string,
  event: string,
  payload?: unknown,
) {
  emitToQuizPlayers(io, quizId, event, payload);
  emitToQuizDashboard(io, quizId, event, payload);
}

const pendingOnlineCountTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function refreshQuizOnlineCount(io: Server, quizId: string) {
  const sockets = await io.in(quizPlayerRoom(quizId)).fetchSockets();
  const participants = new Set<string>();
  for (const socket of sockets) {
    if (socket.data?.isAdmin) continue;
    const participantId = socket.data?.participantId;
    if (typeof participantId === "string" && participantId.trim().length > 0) {
      participants.add(participantId);
    }
  }
  emitToQuizDashboard(io, quizId, "quiz:online:count", { count: participants.size });
}

/** Количество онлайн-игроков (уникальные participantId, без админов). Дебаунс по `QUIZ_ONLINE_COUNT_DEBOUNCE_MS`. */
export function emitQuizOnlineCount(io: Server, quizId: string): void {
  const ms = env.quizOnlineCountDebounceMs;
  if (ms <= 0) {
    void refreshQuizOnlineCount(io, quizId);
    return;
  }
  const prev = pendingOnlineCountTimers.get(quizId);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    pendingOnlineCountTimers.delete(quizId);
    void refreshQuizOnlineCount(io, quizId);
  }, ms);
  pendingOnlineCountTimers.set(quizId, t);
}
