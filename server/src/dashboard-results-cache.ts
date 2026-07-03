import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";
import { logError, logWarn, formatErrorForLog } from "./logging.js";

const RESULTS_KEY_PREFIX = "mq:dash:results:";
const LOCK_KEY_PREFIX = "mq:dash:lock:";
const DEBOUNCE_KEY_PREFIX = "mq:dash:debounce:";
const LOCK_TTL_SEC = 15;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

function resultsKey(quizId: string) {
  return `${RESULTS_KEY_PREFIX}${quizId}`;
}

function lockKey(quizId: string) {
  return `${LOCK_KEY_PREFIX}${quizId}`;
}

export function debounceKey(quizId: string) {
  return `${DEBOUNCE_KEY_PREFIX}${quizId}`;
}

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!env.redisUrl) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const next = createClient({ url: env.redisUrl });
    next.on("error", (err) => logError("[dashboard cache redis]", err));
    try {
      await next.connect();
      client = next as RedisClientType;
      return client;
    } catch (err) {
      logWarn("[dashboard cache redis] connect failed, cache disabled", formatErrorForLog(err));
      connectPromise = null;
      return null;
    }
  })();

  return connectPromise;
}

function cacheTtlMs(): number {
  return env.dashboardResultsCacheMs;
}

export async function getCachedDashboardResultsJson(quizId: string): Promise<string | null> {
  if (env.dashboardResultsCacheMs <= 0) return null;
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    return await redis.get(resultsKey(quizId));
  } catch (err) {
    logWarn("[dashboard cache] read failed", formatErrorForLog(err));
    return null;
  }
}

export async function setCachedDashboardResultsJson(quizId: string, json: string): Promise<void> {
  if (env.dashboardResultsCacheMs <= 0) return;
  const redis = await getRedisClient();
  if (!redis) return;
  const ttlMs = cacheTtlMs();
  if (ttlMs <= 0) return;
  try {
    await redis.set(resultsKey(quizId), json, { PX: ttlMs });
  } catch (err) {
    logWarn("[dashboard cache] write failed", formatErrorForLog(err));
  }
}

export async function invalidateDashboardResultsCache(quizId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.del(resultsKey(quizId));
  } catch (err) {
    logWarn("[dashboard cache] invalidate failed", formatErrorForLog(err));
  }
}

export async function acquireDashboardComputeLock(quizId: string): Promise<boolean> {
  if (env.dashboardResultsCacheMs <= 0) return true;
  const redis = await getRedisClient();
  if (!redis) return true;
  try {
    const reply = await redis.set(lockKey(quizId), "1", { NX: true, EX: LOCK_TTL_SEC });
    return reply === "OK";
  } catch (err) {
    logWarn("[dashboard cache] lock acquire failed", formatErrorForLog(err));
    return true;
  }
}

export async function releaseDashboardComputeLock(quizId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.del(lockKey(quizId));
  } catch (err) {
    logWarn("[dashboard cache] lock release failed", formatErrorForLog(err));
  }
}

export function debounceTokenTtlMs(debounceMs: number): number {
  /** PX токена должен пережить таймер debounce (иначе broadcast молча пропускается). */
  return Math.max(debounceMs + 5_000, debounceMs * 2);
}

export async function setDashboardDebounceToken(
  quizId: string,
  token: string,
  debounceMs: number,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis || debounceMs <= 0) return;
  try {
    await redis.set(debounceKey(quizId), token, { PX: debounceTokenTtlMs(debounceMs) });
  } catch (err) {
    logWarn("[dashboard cache] debounce set failed", formatErrorForLog(err));
  }
}

export async function getDashboardDebounceToken(quizId: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    return await redis.get(debounceKey(quizId));
  } catch (err) {
    logWarn("[dashboard cache] debounce read failed", formatErrorForLog(err));
    return null;
  }
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
