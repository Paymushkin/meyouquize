import { randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import { env } from "../env.js";
import {
  getDashboardDebounceToken,
  invalidateDashboardResultsCache,
  setDashboardDebounceToken,
} from "../dashboard-results-cache.js";
import {
  dashboardBroadcastDelayMs,
  isDashboardDebounceTokenCurrent,
} from "../dashboard-results-build.js";
import { getDashboardResults, getQuizPublicState, type DashboardResults } from "../quiz-service.js";
import { prisma } from "../prisma.js";
import { getStoredPublicView } from "./public-view-store.js";
import { toPublicViewPayload } from "./public-view-helpers.js";
import { broadcastQuizPublicState, emitToQuizDashboard, quizDashboardRoom } from "./quiz-rooms.js";

function emitDashboardBundle(io: Server, quizId: string, results: DashboardResults) {
  io.to(quizDashboardRoom(quizId)).emit("results:dashboard", results);
}

type PendingDebounce = {
  timer: ReturnType<typeof setTimeout>;
  token: string;
  burstStartedAt: number;
};

const pendingTimers = new Map<string, PendingDebounce>();
/** Один пересчёт на quizId за раз: параллельные submit/admin не дублируют getDashboardResults. */
const inFlightBroadcast = new Map<string, Promise<void>>();
/** Submit во время in-flight: после текущего пересчёта нужен ещё один. */
const dirtyAfterBroadcast = new Set<string>();

export function scheduleDashboardResultsBroadcast(io: Server, quizId: string) {
  const debounceMs = env.dashboardResultsDebounceMs;
  const maxWaitMs = env.dashboardResultsMaxWaitMs;
  const token = randomUUID();
  const existing = pendingTimers.get(quizId);
  const burstStartedAt = existing?.burstStartedAt ?? Date.now();
  const delayMs = dashboardBroadcastDelayMs(debounceMs, maxWaitMs, Date.now() - burstStartedAt);
  void setDashboardDebounceToken(quizId, token, Math.max(debounceMs, maxWaitMs, delayMs));

  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    pendingTimers.delete(quizId);
    void (async () => {
      if (env.redisUrl) {
        const redisToken = await getDashboardDebounceToken(quizId);
        // null — ключ истёк в тот же тик, что и таймер; не отменять единственный broadcast.
        if (redisToken !== null && !isDashboardDebounceTokenCurrent(token, redisToken)) return;
      }
      await broadcastDashboardResultsNow(io, quizId);
    })();
  }, delayMs);

  pendingTimers.set(quizId, { timer, token, burstStartedAt });
}

export async function broadcastDashboardResultsNow(io: Server, quizId: string): Promise<void> {
  const existingTimer = pendingTimers.get(quizId);
  if (existingTimer) clearTimeout(existingTimer.timer);
  pendingTimers.delete(quizId);

  const running = inFlightBroadcast.get(quizId);
  if (running) {
    dirtyAfterBroadcast.add(quizId);
    return running;
  }

  const task = (async () => {
    try {
      await invalidateDashboardResultsCache(quizId);
      const results = await getDashboardResults(quizId);
      emitDashboardBundle(io, quizId, results);
    } finally {
      inFlightBroadcast.delete(quizId);
      if (dirtyAfterBroadcast.delete(quizId)) {
        scheduleDashboardResultsBroadcast(io, quizId);
      }
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
