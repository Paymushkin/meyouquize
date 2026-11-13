import { createClient, type RedisClientType } from "redis";
import {
  isProjectorTimelineAdvancing,
  mergePublicViewState,
  normalizeProjectorTimelineState,
  projectorTimelineStepToPublicViewPatch,
  type PublicViewState,
  type ProjectorTimelineState,
  type ProjectorTimelineMode,
} from "@meyouquize/shared";
import type { Server } from "socket.io";
import { env } from "./env.js";
import { EXPERIMENT_TIMELINE_REDIS_PREFIX, timelineLockKey } from "./experiment-redis-keys.js";
import { logError, logWarn, formatErrorForLog } from "./logging.js";
import { prisma } from "./prisma.js";
import {
  getNetworkingQuizStats,
  listProjectorNetworkingGuests,
  mergeProjectorSpotlightGuests,
} from "./networking-service.js";
import { toPublicViewPayload } from "./socket/public-view-helpers.js";
import { getStoredPublicView, saveStoredPublicView } from "./socket/public-view-store.js";
import { emitToQuizDashboard } from "./socket/quiz-rooms.js";
import { getQuizPublicState } from "./quiz-service.js";

/** Макс. профилей в ротации на шаге networking_* (не зависит от duration шага). */
const NETWORKING_SPOTLIGHT_LIMIT = 40;

const ACTIVE_SET_KEY = `${EXPERIMENT_TIMELINE_REDIS_PREFIX}active`;
const LOCK_TTL_SEC = 8;
const TICK_MS = 1500;

let redis: RedisClientType | null = null;
let redisConnect: Promise<RedisClientType | null> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let ioRef: Server | null = null;
/** Fallback when Redis is unavailable (single-worker). */
const localActive = new Set<string>();

async function getRedis(): Promise<RedisClientType | null> {
  if (!env.redisUrl) return null;
  if (redis?.isOpen) return redis;
  if (redisConnect) return redisConnect;
  redisConnect = (async () => {
    const next = createClient({ url: env.redisUrl });
    next.on("error", (err) => logError("[timeline redis]", err));
    try {
      await next.connect();
      redis = next as RedisClientType;
      return redis;
    } catch (err) {
      logWarn("[timeline redis] connect failed", formatErrorForLog(err));
      redisConnect = null;
      return null;
    }
  })();
  return redisConnect;
}

export async function markTimelineActive(quizId: string): Promise<void> {
  localActive.add(quizId);
  const client = await getRedis();
  if (client) await client.sAdd(ACTIVE_SET_KEY, quizId);
}

export async function markTimelineInactive(quizId: string): Promise<void> {
  localActive.delete(quizId);
  const client = await getRedis();
  if (client) await client.sRem(ACTIVE_SET_KEY, quizId);
}

async function listActiveQuizIds(): Promise<string[]> {
  const client = await getRedis();
  if (client) {
    const members = await client.sMembers(ACTIVE_SET_KEY);
    return members;
  }
  return [...localActive];
}

async function tryLock(quizId: string): Promise<boolean> {
  const client = await getRedis();
  if (!client) return true;
  const reply = await client.set(timelineLockKey(quizId), String(process.pid), {
    NX: true,
    EX: LOCK_TTL_SEC,
  });
  return reply === "OK";
}

async function unlock(quizId: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.del(timelineLockKey(quizId));
}

function withPlayingFlag(timeline: ProjectorTimelineState): ProjectorTimelineState {
  return {
    ...timeline,
    playing: isProjectorTimelineAdvancing(timeline),
  };
}

/** Подтянуть новых гостей и свежие поля/аватар без перетасовки порядка. */
async function refreshNetworkingSpotlightGuests(
  io: Server,
  quizId: string,
  view: PublicViewState,
  mode: ProjectorTimelineMode,
): Promise<boolean> {
  if (mode !== "networking_profiles" && mode !== "networking_incomplete") return false;
  const prevGuests = view.networkingSpotlightGuests ?? [];
  const pool = await listProjectorNetworkingGuests(quizId, {
    kind: mode === "networking_profiles" ? "complete" : "incomplete",
    limit: NETWORKING_SPOTLIGHT_LIMIT,
    shuffle: false,
  });
  const guests = mergeProjectorSpotlightGuests(prevGuests, pool, NETWORKING_SPOTLIGHT_LIMIT);
  const same =
    prevGuests.length === guests.length &&
    prevGuests.every(
      (g, i) =>
        g.participantId === guests[i]?.participantId &&
        g.nickname === guests[i]?.nickname &&
        g.offers === guests[i]?.offers &&
        g.seeking === guests[i]?.seeking &&
        g.fullName === guests[i]?.fullName &&
        g.avatarUrl === guests[i]?.avatarUrl &&
        g.company === guests[i]?.company,
    );
  if (same) return false;
  const refreshed = mergePublicViewState(view, {
    networkingSpotlightGuests: guests,
  } as Parameters<typeof mergePublicViewState>[1]);
  await saveStoredPublicView(quizId, refreshed);
  const quiz = await getQuizPublicState(quizId);
  if (quiz) {
    emitToQuizDashboard(
      io,
      quizId,
      "results:public:view",
      toPublicViewPayload(refreshed, quiz.title),
    );
  }
  return true;
}

export async function applyTimelineStepAndBroadcast(
  io: Server,
  quizId: string,
  view: PublicViewState,
  timeline: ProjectorTimelineState,
  opts?: { skipModePatch?: boolean },
): Promise<PublicViewState> {
  const step = timeline.steps[timeline.cursor];
  if (!step) {
    const stopped: PublicViewState = {
      ...view,
      projectorTimeline: withPlayingFlag({
        ...timeline,
        stepStartedAt: null,
      }),
    };
    await saveStoredPublicView(quizId, stopped);
    await markTimelineInactive(quizId);
    return stopped;
  }

  const nextTimeline = withPlayingFlag({
    ...timeline,
    enabled: true,
    stepStartedAt: Date.now(),
  });

  // При override не перезаписываем mode — только обновляем meta таймлайна.
  if (opts?.skipModePatch || nextTimeline.suppressed) {
    const nextView: PublicViewState = {
      ...view,
      projectorTimeline: nextTimeline,
    };
    await saveStoredPublicView(quizId, nextView);
    if (isProjectorTimelineAdvancing(nextTimeline)) {
      await markTimelineActive(quizId);
    } else if (nextTimeline.frozen && !nextTimeline.suppressed) {
      // Freeze: держим в active для stats refresh, но advance не сработает.
      await markTimelineActive(quizId);
    } else if (nextTimeline.suppressed) {
      await markTimelineActive(quizId);
    } else {
      await markTimelineInactive(quizId);
    }
    const quiz = await getQuizPublicState(quizId);
    if (quiz) {
      emitToQuizDashboard(
        io,
        quizId,
        "results:public:view",
        toPublicViewPayload(nextView, quiz.title),
      );
    }
    return nextView;
  }

  const patch: Record<string, unknown> = {
    ...projectorTimelineStepToPublicViewPatch(step),
  };
  if (step.mode === "networking_profiles" || step.mode === "networking_incomplete") {
    const guests = await listProjectorNetworkingGuests(quizId, {
      kind: step.mode === "networking_profiles" ? "complete" : "incomplete",
      limit: NETWORKING_SPOTLIGHT_LIMIT,
    });
    patch.networkingSpotlightGuests = guests;
  } else if (step.mode === "networking_stats") {
    patch.networkingStats = await getNetworkingQuizStats(quizId);
  } else {
    patch.networkingSpotlightGuests = [];
  }

  const nextView = mergePublicViewState(view, {
    ...patch,
    projectorTimeline: nextTimeline,
  } as Parameters<typeof mergePublicViewState>[1]);
  await saveStoredPublicView(quizId, nextView);
  await markTimelineActive(quizId);
  const quiz = await getQuizPublicState(quizId);
  if (quiz) {
    emitToQuizDashboard(
      io,
      quizId,
      "results:public:view",
      toPublicViewPayload(nextView, quiz.title),
    );
  }
  return nextView;
}

async function advanceIfDue(io: Server, quizId: string): Promise<void> {
  const locked = await tryLock(quizId);
  if (!locked) return;
  try {
    const view = await getStoredPublicView(quizId);
    const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
    if (timeline.steps.length === 0) {
      await markTimelineInactive(quizId);
      return;
    }
    // title — не интерактивный override; вернуть плейлист (иначе «Альфа Саммит» навечно).
    if (timeline.suppressed && view.mode === "title") {
      await resumeTimelineAfterOverride(io, quizId, view);
      return;
    }
    // Freeze / override — не двигаем cursor; подтягиваем данные шага.
    if (!isProjectorTimelineAdvancing(timeline)) {
      if (timeline.suppressed) return;
      const held = timeline.steps[timeline.cursor];
      if (!held) return;
      // После coerce mode (title→profiles) или рассинхрона — применить шаг.
      if (view.mode !== held.mode) {
        await applyTimelineStepAndBroadcast(io, quizId, view, timeline);
        return;
      }
      if (held.mode === "networking_stats") {
        const stats = await getNetworkingQuizStats(quizId);
        const refreshed = mergePublicViewState(view, {
          networkingStats: stats,
        } as Parameters<typeof mergePublicViewState>[1]);
        if (
          refreshed.networkingStats.messages !== view.networkingStats.messages ||
          refreshed.networkingStats.guests !== view.networkingStats.guests ||
          refreshed.networkingStats.acquaintances !== view.networkingStats.acquaintances
        ) {
          await saveStoredPublicView(quizId, refreshed);
          const quiz = await getQuizPublicState(quizId);
          if (quiz) {
            emitToQuizDashboard(
              io,
              quizId,
              "results:public:view",
              toPublicViewPayload(refreshed, quiz.title),
            );
          }
        }
      } else if (held.mode === "networking_profiles" || held.mode === "networking_incomplete") {
        await refreshNetworkingSpotlightGuests(io, quizId, view, held.mode);
      }
      return;
    }

    const step = timeline.steps[timeline.cursor];
    if (!step) {
      await markTimelineInactive(quizId);
      return;
    }
    // stepStartedAt=null → elapsed всегда ~0 и mode никогда не применяется.
    if (view.mode !== step.mode || timeline.stepStartedAt == null) {
      await applyTimelineStepAndBroadcast(io, quizId, view, timeline);
      return;
    }
    const started = timeline.stepStartedAt;
    const elapsed = Date.now() - started;
    if (elapsed < step.durationSec * 1000) {
      if (step.mode === "networking_stats") {
        const stats = await getNetworkingQuizStats(quizId);
        const refreshed = mergePublicViewState(view, {
          networkingStats: stats,
        } as Parameters<typeof mergePublicViewState>[1]);
        if (
          refreshed.networkingStats.messages !== view.networkingStats.messages ||
          refreshed.networkingStats.guests !== view.networkingStats.guests ||
          refreshed.networkingStats.acquaintances !== view.networkingStats.acquaintances
        ) {
          await saveStoredPublicView(quizId, refreshed);
          const quiz = await getQuizPublicState(quizId);
          if (quiz) {
            emitToQuizDashboard(
              io,
              quizId,
              "results:public:view",
              toPublicViewPayload(refreshed, quiz.title),
            );
          }
        }
      } else if (step.mode === "networking_profiles" || step.mode === "networking_incomplete") {
        // Пока крутится шаг — подхватываем новых гостей и правки полей/фото.
        await refreshNetworkingSpotlightGuests(io, quizId, view, step.mode);
      }
      return;
    }

    const nextCursor = (timeline.cursor + 1) % timeline.steps.length;
    const nextTimeline: ProjectorTimelineState = withPlayingFlag({
      ...timeline,
      cursor: nextCursor,
      stepStartedAt: Date.now(),
    });
    await applyTimelineStepAndBroadcast(io, quizId, view, nextTimeline);
  } catch (err) {
    logError("[timeline] advance failed", err);
  } finally {
    await unlock(quizId);
  }
}

async function tick(): Promise<void> {
  if (!ioRef) return;
  const ids = await listActiveQuizIds();
  for (const quizId of ids) {
    await advanceIfDue(ioRef, quizId);
  }
}

export function startProjectorTimelineSequencer(io: Server): void {
  ioRef = io;
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    void tick();
  }, TICK_MS);
  tickTimer.unref?.();
  console.info("[timeline] sequencer started");
}

export function stopProjectorTimelineSequencer(): void {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  ioRef = null;
}

/** Интерактив / Q&A перекрывают таймлайн: не advance, mode из view сохраняем. */
export async function suspendTimelineForOverride(
  io: Server,
  quizId: string,
  view: PublicViewState,
): Promise<PublicViewState> {
  const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
  const nextTimeline = withPlayingFlag({
    ...timeline,
    suppressed: true,
  });
  const next: PublicViewState = {
    ...view,
    projectorTimeline: nextTimeline,
  };
  await saveStoredPublicView(quizId, next);
  await markTimelineActive(quizId);
  const quiz = await getQuizPublicState(quizId);
  if (quiz) {
    emitToQuizDashboard(io, quizId, "results:public:view", toPublicViewPayload(next, quiz.title));
  }
  return next;
}

/** После снятия интерактива — снова показать текущий шаг таймлайна. */
export async function resumeTimelineAfterOverride(
  io: Server,
  quizId: string,
  view?: PublicViewState,
): Promise<PublicViewState> {
  const current = view ?? (await getStoredPublicView(quizId));
  const timeline = normalizeProjectorTimelineState(current.projectorTimeline);
  const nextTimeline = withPlayingFlag({
    ...timeline,
    suppressed: false,
    enabled: true,
    stepStartedAt: Date.now(),
  });
  return applyTimelineStepAndBroadcast(io, quizId, current, nextTimeline);
}

/** @deprecated use suspendTimelineForOverride */
export async function pauseTimelineForManualOverride(
  io: Server,
  quizId: string,
  view: PublicViewState,
): Promise<PublicViewState> {
  return suspendTimelineForOverride(io, quizId, view);
}

/** Freeze на шаге: cursor = index, frozen = true, apply если не suppressed. */
export async function freezeTimelineStep(
  io: Server,
  quizId: string,
  stepIndex: number,
): Promise<PublicViewState> {
  const view = await getStoredPublicView(quizId);
  const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
  if (timeline.steps.length === 0) throw new Error("Timeline has no steps");
  const cursor = Math.max(0, Math.min(timeline.steps.length - 1, Math.trunc(stepIndex)));
  const nextTimeline = withPlayingFlag({
    ...timeline,
    enabled: true,
    frozen: true,
    cursor,
    stepStartedAt: Date.now(),
  });
  return applyTimelineStepAndBroadcast(io, quizId, view, nextTimeline, {
    skipModePatch: nextTimeline.suppressed,
  });
}

/** Снять freeze — снова крутить duration. */
export async function unfreezeTimeline(io: Server, quizId: string): Promise<PublicViewState> {
  const view = await getStoredPublicView(quizId);
  const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
  const nextTimeline = withPlayingFlag({
    ...timeline,
    frozen: false,
    stepStartedAt: Date.now(),
  });
  const next: PublicViewState = {
    ...view,
    projectorTimeline: nextTimeline,
  };
  await saveStoredPublicView(quizId, next);
  await markTimelineActive(quizId);
  const quiz = await getQuizPublicState(quizId);
  if (quiz) {
    emitToQuizDashboard(io, quizId, "results:public:view", toPublicViewPayload(next, quiz.title));
  }
  return next;
}

/** Recover / seed active set from DB on boot. */
export async function hydrateTimelineActiveFromDb(): Promise<void> {
  const rows = await prisma.quiz.findMany({
    select: { id: true, publicView: true },
  });
  for (const row of rows) {
    const view = row.publicView;
    if (!view || typeof view !== "object" || Array.isArray(view)) continue;
    const raw = view as Record<string, unknown>;
    const timeline = normalizeProjectorTimelineState(raw.projectorTimeline);
    // Всегда держим в active, если есть шаги (advance сам проверит frozen/suppressed).
    if (timeline.steps.length > 0) {
      await markTimelineActive(row.id);
      if (ioRef) {
        const stored = await getStoredPublicView(row.id);
        const normalized = normalizeProjectorTimelineState(stored.projectorTimeline);
        if (normalized.suppressed && stored.mode === "title") {
          await resumeTimelineAfterOverride(ioRef, row.id, stored);
          continue;
        }
        const step = normalized.steps[normalized.cursor];
        if (
          step &&
          !normalized.suppressed &&
          (stored.mode !== step.mode || normalized.stepStartedAt == null)
        ) {
          await applyTimelineStepAndBroadcast(ioRef, row.id, stored, {
            ...normalized,
            enabled: true,
          });
        }
      }
    }
  }
}
