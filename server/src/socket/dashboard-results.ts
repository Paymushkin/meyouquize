import type { Server } from "socket.io";
import { env } from "../env.js";
import { getDashboardResults, getQuizPublicState, type DashboardResults } from "../quiz-service.js";
import { prisma } from "../prisma.js";
import { getStoredPublicView } from "./public-view-store.js";
import { toPublicViewPayload } from "./public-view-helpers.js";
import { broadcastQuizPublicState, emitToQuizDashboard, quizDashboardRoom } from "./quiz-rooms.js";

function emitDashboardBundle(io: Server, quizId: string, results: DashboardResults) {
  io.to(quizDashboardRoom(quizId)).emit("results:dashboard", results);
}

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Один пересчёт на quizId за раз: параллельные submit/admin не дублируют getDashboardResults. */
const inFlightBroadcast = new Map<string, Promise<void>>();

export function scheduleDashboardResultsBroadcast(io: Server, quizId: string) {
  const existing = pendingTimers.get(quizId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingTimers.delete(quizId);
    void broadcastDashboardResultsNow(io, quizId);
  }, env.dashboardResultsDebounceMs);
  pendingTimers.set(quizId, timer);
}

export async function broadcastDashboardResultsNow(io: Server, quizId: string): Promise<void> {
  const existingTimer = pendingTimers.get(quizId);
  if (existingTimer) clearTimeout(existingTimer);
  pendingTimers.delete(quizId);

  const running = inFlightBroadcast.get(quizId);
  if (running) return running;

  const task = (async () => {
    try {
      const results = await getDashboardResults(quizId);
      emitDashboardBundle(io, quizId, results);
    } finally {
      inFlightBroadcast.delete(quizId);
    }
  })();

  inFlightBroadcast.set(quizId, task);
  return task;
}

/** После replace вопросов: дашборд, public view (сброс удалённого questionId) и state:quiz. */
export async function broadcastProjectorRoomSync(io: Server, quizId: string): Promise<void> {
  const [results, view, quizRow, quizState] = await Promise.all([
    getDashboardResults(quizId),
    getStoredPublicView(quizId),
    prisma.quiz.findUnique({ where: { id: quizId }, select: { title: true } }),
    getQuizPublicState(quizId),
  ]);
  emitDashboardBundle(io, quizId, results);
  emitToQuizDashboard(
    io,
    quizId,
    "results:public:view",
    toPublicViewPayload(view, quizRow?.title ?? "Квиз"),
  );
  if (quizState) {
    await broadcastQuizPublicState(io, quizId, quizState);
  }
}
