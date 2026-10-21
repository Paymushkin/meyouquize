import { createClient, type RedisClientType } from "redis";
import {
  mergePublicViewState,
  normalizeProjectorTimelineState,
  projectorTimelineStepToPublicViewPatch,
  type PublicViewState,
  type ProjectorTimelineState,
} from "@meyouquize/shared";
import type { Server } from "socket.io";
import { env } from "./env.js";
import { EXPERIMENT_TIMELINE_REDIS_PREFIX, timelineLockKey } from "./experiment-redis-keys.js";
import { logError, logWarn, formatErrorForLog } from "./logging.js";
import { prisma } from "./prisma.js";
import { toPublicViewPayload } from "./socket/public-view-helpers.js";
import { getStoredPublicView, saveStoredPublicView } from "./socket/public-view-store.js";
import { emitToQuizDashboard } from "./socket/quiz-rooms.js";
import { getQuizPublicState } from "./quiz-service.js";

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

export async function applyTimelineStepAndBroadcast(
  io: Server,
  quizId: string,
  view: PublicViewState,
  timeline: ProjectorTimelineState,
): Promise<PublicViewState> {
  const step = timeline.steps[timeline.cursor];
  if (!step) {
    const stopped: PublicViewState = {
      ...view,
      projectorTimeline: {
        ...timeline,
        playing: false,
        stepStartedAt: null,
      },
    };
    await saveStoredPublicView(quizId, stopped);
    await markTimelineInactive(quizId);
    return stopped;
  }
  const patch = projectorTimelineStepToPublicViewPatch(step);
  const nextTimeline: ProjectorTimelineState = {
    ...timeline,
    playing: true,
    stepStartedAt: Date.now(),
  };
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
    if (!timeline.playing || timeline.steps.length === 0) {
      await markTimelineInactive(quizId);
      return;
    }
    const step = timeline.steps[timeline.cursor];
    if (!step) {
      await markTimelineInactive(quizId);
      return;
    }
    const started = timeline.stepStartedAt ?? Date.now();
    const elapsed = Date.now() - started;
    if (elapsed < step.durationSec * 1000) return;

    const nextCursor = (timeline.cursor + 1) % timeline.steps.length;
    const nextTimeline: ProjectorTimelineState = {
      ...timeline,
      cursor: nextCursor,
      stepStartedAt: Date.now(),
    };
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

export async function pauseTimelineForManualOverride(
  io: Server,
  quizId: string,
  view: PublicViewState,
): Promise<PublicViewState> {
  const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
  if (!timeline.playing) return view;
  const next: PublicViewState = {
    ...view,
    projectorTimeline: {
      ...timeline,
      playing: false,
      stepStartedAt: null,
    },
  };
  await saveStoredPublicView(quizId, next);
  await markTimelineInactive(quizId);
  const quiz = await getQuizPublicState(quizId);
  if (quiz) {
    emitToQuizDashboard(io, quizId, "results:public:view", toPublicViewPayload(next, quiz.title));
  }
  return next;
}

/** Recover active set from DB on boot (playing timelines). */
export async function hydrateTimelineActiveFromDb(): Promise<void> {
  const rows = await prisma.quiz.findMany({
    select: { id: true, publicView: true },
  });
  for (const row of rows) {
    const view = row.publicView;
    if (!view || typeof view !== "object" || Array.isArray(view)) continue;
    const timeline = normalizeProjectorTimelineState(
      (view as Record<string, unknown>).projectorTimeline,
    );
    if (timeline.playing && timeline.steps.length > 0) {
      await markTimelineActive(row.id);
    }
  }
}
