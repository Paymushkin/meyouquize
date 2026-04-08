import type { Server } from "socket.io";

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
export function emitToQuizPlayersAndDashboard(io: Server, quizId: string, event: string, payload?: unknown) {
  emitToQuizPlayers(io, quizId, event, payload);
  emitToQuizDashboard(io, quizId, event, payload);
}
