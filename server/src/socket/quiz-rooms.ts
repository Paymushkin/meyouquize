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
const pendingOnlineDropConfirmTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastEmittedOnlineCounts = new Map<string, number>();
const ONLINE_DROP_CONFIRM_MS = 1800;

async function measureQuizOnlineCount(io: Server, quizId: string): Promise<number> {
  const sockets = await io.in(quizPlayerRoom(quizId)).fetchSockets();
  const participants = new Set<string>();
  for (const socket of sockets) {
    if (socket.data?.isAdmin) continue;
    const participantId = socket.data?.participantId;
    if (typeof participantId === "string" && participantId.trim().length > 0) {
      participants.add(participantId);
    }
  }
  return participants.size;
}

function emitQuizOnlineCountValue(io: Server, quizId: string, count: number): void {
  lastEmittedOnlineCounts.set(quizId, count);
  emitToQuizDashboard(io, quizId, "quiz:online:count", { count });
}

async function refreshQuizOnlineCount(io: Server, quizId: string) {
  let measured: number;
  try {
    measured = await measureQuizOnlineCount(io, quizId);
  } catch (error) {
    console.warn("[socket] quiz online count refresh failed", {
      quizId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const prev = lastEmittedOnlineCounts.get(quizId);
  if (prev === undefined || measured >= prev) {
    const dropTimer = pendingOnlineDropConfirmTimers.get(quizId);
    if (dropTimer) {
      clearTimeout(dropTimer);
      pendingOnlineDropConfirmTimers.delete(quizId);
    }
    emitQuizOnlineCountValue(io, quizId, measured);
    return;
  }

  // Защита от кратковременных «провалов» (обрыв/переподключение admin/projector/network jitter):
  // подтверждаем снижение вторым замером через короткую паузу.
  if (pendingOnlineDropConfirmTimers.has(quizId)) return;
  const t = setTimeout(async () => {
    pendingOnlineDropConfirmTimers.delete(quizId);
    try {
      const confirmed = await measureQuizOnlineCount(io, quizId);
      const latestPrev = lastEmittedOnlineCounts.get(quizId) ?? prev;
      if (confirmed >= latestPrev) {
        emitQuizOnlineCountValue(io, quizId, confirmed);
        return;
      }
      emitQuizOnlineCountValue(io, quizId, confirmed);
    } catch (error) {
      console.warn("[socket] quiz online count drop confirm failed", {
        quizId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, ONLINE_DROP_CONFIRM_MS);
  pendingOnlineDropConfirmTimers.set(quizId, t);
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
