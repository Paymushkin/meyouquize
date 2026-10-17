import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";
import { formatErrorForLog, logError, logWarn } from "./logging.js";

export type ReactionType = string;

const DEFAULT_REACTIONS = ["👍", "👏", "🔥", "🤔"] as const;

export type ReactionSessionHistoryItem = {
  id: string;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
};

export type ReactionSessionPublic = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
  history: ReactionSessionHistoryItem[];
};

type ReactionSessionInternal = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: Date;
  endsAt: Date;
  reactions: string[];
  counts: Record<string, number>;
  participantIds: Set<string>;
  reactionParticipantIds: Record<string, Set<string>>;
};

type ReactionSessionStored = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  participantIds: string[];
  reactionParticipantIds: Record<string, string[]>;
  history: ReactionSessionHistoryItem[];
};

const sessionsByQuiz = new Map<string, ReactionSessionInternal>();
const historyByQuiz = new Map<string, ReactionSessionHistoryItem[]>();

/** Сессия в Redis (общий state для CLUSTER_WORKERS>1). */
const REDIS_KEY_PREFIX = "mq:rx:session:";
const REACTION_SESSION_INACTIVE_TTL_MS = 24 * 60 * 60 * 1000;

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

function redisKey(quizId: string): string {
  return `${REDIS_KEY_PREFIX}${quizId}`;
}

function useRedisStore(): boolean {
  return Boolean(env.redisUrl);
}

async function getRedis(): Promise<RedisClientType | null> {
  if (!env.redisUrl) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    const next = createClient({ url: env.redisUrl });
    next.on("error", (err) => logError("[reactions redis]", err));
    try {
      await next.connect();
      redisClient = next as RedisClientType;
      return redisClient;
    } catch (err) {
      logWarn("[reactions redis] connect failed, using memory", formatErrorForLog(err));
      redisConnectPromise = null;
      return null;
    }
  })();

  return redisConnectPromise;
}

function cleanupExpiredReactionsForQuiz(quizId: string, nowMs: number): void {
  const session = sessionsByQuiz.get(quizId);
  if (!session) return;
  if (session.isActive) {
    if (session.endsAt.getTime() > nowMs) return;
    session.isActive = false;
    pushHistorySnapshot(session);
  }

  const endsAtMs = session.endsAt.getTime();
  if (endsAtMs + REACTION_SESSION_INACTIVE_TTL_MS >= nowMs) return;

  sessionsByQuiz.delete(quizId);
  historyByQuiz.delete(quizId);
}

function normalizeReactionList(reactions?: string[]): string[] {
  const source =
    Array.isArray(reactions) && reactions.length > 0 ? reactions : [...DEFAULT_REACTIONS];
  const deduped: string[] = [];
  for (const item of source) {
    const trimmed = (item ?? "").trim();
    if (!trimmed) continue;
    if (!deduped.includes(trimmed)) deduped.push(trimmed);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_REACTIONS];
}

function makeEmptyCounts(reactions: string[]): Record<string, number> {
  return reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction] = 0;
    return acc;
  }, {});
}

function mergeSeedCounts(
  reactions: string[],
  seed?: Record<string, number>,
): Record<string, number> {
  const counts = makeEmptyCounts(reactions);
  if (!seed) return counts;
  for (const reaction of reactions) {
    const value = seed[reaction];
    if (typeof value === "number" && Number.isFinite(value)) {
      counts[reaction] = Math.max(0, Math.trunc(value));
    }
  }
  return counts;
}

function makeEmptyReactionParticipantIds(reactions: string[]): Record<string, Set<string>> {
  return reactions.reduce<Record<string, Set<string>>>((acc, reaction) => {
    acc[reaction] = new Set<string>();
    return acc;
  }, {});
}

function toUniqueReactorsByReactionMap(session: ReactionSessionInternal): Record<string, number> {
  return session.reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction] = session.reactionParticipantIds[reaction]?.size ?? 0;
    return acc;
  }, {});
}

function computeTotals(
  session: ReactionSessionInternal,
): Pick<ReactionSessionPublic, "totalReactions" | "uniqueReactors"> {
  const totalReactions = Object.values(session.counts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const uniqueReactors = session.participantIds.size;
  return { totalReactions, uniqueReactors };
}

function buildHistoryForQuiz(quizId: string): ReactionSessionHistoryItem[] {
  return historyByQuiz.get(quizId) ?? [];
}

function pushHistorySnapshot(session: ReactionSessionInternal) {
  const totals = computeTotals(session);
  const current = historyByQuiz.get(session.quizId) ?? [];
  const entry: ReactionSessionHistoryItem = {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
  };
  const filtered = current.filter((item) => item.id !== session.id);
  historyByQuiz.set(session.quizId, [entry, ...filtered].slice(0, 30));
}

function toPublicFromInternal(session: ReactionSessionInternal): ReactionSessionPublic {
  const totals = computeTotals(session);
  return {
    id: session.id,
    quizId: session.quizId,
    isActive: session.isActive,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
    history: buildHistoryForQuiz(session.quizId),
  };
}

function toStored(
  session: ReactionSessionInternal,
  history: ReactionSessionHistoryItem[],
): ReactionSessionStored {
  return {
    id: session.id,
    quizId: session.quizId,
    isActive: session.isActive,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    participantIds: [...session.participantIds],
    reactionParticipantIds: Object.fromEntries(
      Object.entries(session.reactionParticipantIds).map(([reaction, set]) => [reaction, [...set]]),
    ),
    history,
  };
}

function fromStored(stored: ReactionSessionStored): ReactionSessionInternal {
  return {
    id: stored.id,
    quizId: stored.quizId,
    isActive: stored.isActive,
    startedAt: new Date(stored.startedAt),
    endsAt: new Date(stored.endsAt),
    reactions: [...stored.reactions],
    counts: { ...stored.counts },
    participantIds: new Set(stored.participantIds ?? []),
    reactionParticipantIds: Object.fromEntries(
      Object.entries(stored.reactionParticipantIds ?? {}).map(([reaction, ids]) => [
        reaction,
        new Set(ids),
      ]),
    ),
  };
}

function toPublicFromStored(stored: ReactionSessionStored): ReactionSessionPublic {
  const uniqueReactorsByReaction = stored.reactions.reduce<Record<string, number>>(
    (acc, reaction) => {
      acc[reaction] = stored.reactionParticipantIds[reaction]?.length ?? 0;
      return acc;
    },
    {},
  );
  const totalReactions = Object.values(stored.counts).reduce((sum, count) => sum + (count ?? 0), 0);
  return {
    id: stored.id,
    quizId: stored.quizId,
    isActive: stored.isActive,
    startedAt: stored.startedAt,
    endsAt: stored.endsAt,
    reactions: [...stored.reactions],
    counts: { ...stored.counts },
    uniqueReactorsByReaction,
    totalReactions,
    uniqueReactors: stored.participantIds.length,
    history: stored.history ?? [],
  };
}

function sessionTtlMs(endsAtIso: string): number {
  const endsAt = Date.parse(endsAtIso);
  if (!Number.isFinite(endsAt)) return REACTION_SESSION_INACTIVE_TTL_MS;
  return Math.max(60_000, endsAt + REACTION_SESSION_INACTIVE_TTL_MS - Date.now());
}

async function readStored(quizId: string): Promise<ReactionSessionStored | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKey(quizId));
    if (!raw) return null;
    return JSON.parse(raw) as ReactionSessionStored;
  } catch (err) {
    logWarn("[reactions redis] get failed", formatErrorForLog(err));
    return null;
  }
}

async function writeStored(stored: ReactionSessionStored): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey(stored.quizId), JSON.stringify(stored), {
      PX: sessionTtlMs(stored.endsAt),
    });
  } catch (err) {
    logWarn("[reactions redis] set failed", formatErrorForLog(err));
  }
}

function expireIfNeeded(stored: ReactionSessionStored, nowMs: number): ReactionSessionStored {
  if (!stored.isActive) return stored;
  const endsAtMs = Date.parse(stored.endsAt);
  if (!Number.isFinite(endsAtMs) || endsAtMs > nowMs) return stored;
  const session = fromStored(stored);
  session.isActive = false;
  const history = [...(stored.history ?? [])];
  const totals = computeTotals(session);
  const entry: ReactionSessionHistoryItem = {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
  };
  const nextHistory = [entry, ...history.filter((item) => item.id !== session.id)].slice(0, 30);
  return toStored(session, nextHistory);
}

function getFromMemory(quizId: string): ReactionSessionPublic | null {
  cleanupExpiredReactionsForQuiz(quizId, Date.now());
  const session = sessionsByQuiz.get(quizId);
  if (!session) return null;
  return toPublicFromInternal(session);
}

function startInMemory(
  quizId: string,
  durationSec: number,
  reactions?: string[],
  initialCounts?: Record<string, number>,
): ReactionSessionPublic {
  cleanupExpiredReactionsForQuiz(quizId, Date.now());
  const prev = sessionsByQuiz.get(quizId);
  if (prev) {
    prev.isActive = false;
    pushHistorySnapshot(prev);
  }
  const normalizedReactions = normalizeReactionList(reactions);
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationSec * 1000);
  const session: ReactionSessionInternal = {
    id: globalThis.crypto?.randomUUID?.() ?? `reaction_${Date.now()}`,
    quizId,
    isActive: true,
    startedAt: now,
    endsAt,
    reactions: normalizedReactions,
    counts: mergeSeedCounts(normalizedReactions, initialCounts),
    participantIds: new Set(),
    reactionParticipantIds: makeEmptyReactionParticipantIds(normalizedReactions),
  };
  sessionsByQuiz.set(quizId, session);
  return toPublicFromInternal(session);
}

function stopInMemory(quizId: string): ReactionSessionPublic | null {
  const session = sessionsByQuiz.get(quizId);
  if (!session) return null;
  session.isActive = false;
  pushHistorySnapshot(session);
  cleanupExpiredReactionsForQuiz(quizId, Date.now());
  return getFromMemory(quizId);
}

function addInMemory(
  quizId: string,
  participantId: string,
  reactionType: ReactionType,
): ReactionSessionPublic | null {
  cleanupExpiredReactionsForQuiz(quizId, Date.now());
  const session = sessionsByQuiz.get(quizId);
  if (!session || !session.isActive) return null;
  if (!session.reactions.includes(reactionType)) return null;
  session.counts[reactionType] = (session.counts[reactionType] ?? 0) + 1;
  session.participantIds.add(participantId);
  session.reactionParticipantIds[reactionType]?.add(participantId);
  pushHistorySnapshot(session);
  return toPublicFromInternal(session);
}

export async function getReactionSessionPublic(
  quizId: string,
): Promise<ReactionSessionPublic | null> {
  if (!useRedisStore()) return getFromMemory(quizId);

  const redis = await getRedis();
  if (!redis) return getFromMemory(quizId);

  let stored = await readStored(quizId);
  if (!stored) return null;

  const nowMs = Date.now();
  const next = expireIfNeeded(stored, nowMs);
  if (next !== stored) {
    await writeStored(next);
    stored = next;
  }

  const endsAtMs = Date.parse(stored.endsAt);
  if (
    !stored.isActive &&
    Number.isFinite(endsAtMs) &&
    endsAtMs + REACTION_SESSION_INACTIVE_TTL_MS < nowMs
  ) {
    try {
      await redis.del(redisKey(quizId));
    } catch {
      /* ignore */
    }
    return null;
  }

  return toPublicFromStored(stored);
}

export async function startReactionSession(
  quizId: string,
  durationSec: number,
  reactions?: string[],
  initialCounts?: Record<string, number>,
): Promise<ReactionSessionPublic> {
  if (!useRedisStore()) return startInMemory(quizId, durationSec, reactions, initialCounts);

  const redis = await getRedis();
  if (!redis) return startInMemory(quizId, durationSec, reactions, initialCounts);

  const prev = await readStored(quizId);
  let history: ReactionSessionHistoryItem[] = prev?.history ?? [];
  if (prev?.isActive) {
    const prevInternal = fromStored({ ...prev, isActive: false });
    const totals = computeTotals(prevInternal);
    const entry: ReactionSessionHistoryItem = {
      id: prevInternal.id,
      startedAt: prevInternal.startedAt.toISOString(),
      endsAt: prevInternal.endsAt.toISOString(),
      reactions: [...prevInternal.reactions],
      counts: { ...prevInternal.counts },
      uniqueReactorsByReaction: toUniqueReactorsByReactionMap(prevInternal),
      totalReactions: totals.totalReactions,
      uniqueReactors: totals.uniqueReactors,
    };
    history = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 30);
  }

  const normalizedReactions = normalizeReactionList(reactions);
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationSec * 1000);
  const session: ReactionSessionInternal = {
    id: globalThis.crypto?.randomUUID?.() ?? `reaction_${Date.now()}`,
    quizId,
    isActive: true,
    startedAt: now,
    endsAt,
    reactions: normalizedReactions,
    counts: mergeSeedCounts(normalizedReactions, initialCounts),
    participantIds: new Set(),
    reactionParticipantIds: makeEmptyReactionParticipantIds(normalizedReactions),
  };
  const stored = toStored(session, history);
  await writeStored(stored);
  return toPublicFromStored(stored);
}

export async function stopReactionSession(quizId: string): Promise<ReactionSessionPublic | null> {
  if (!useRedisStore()) return stopInMemory(quizId);

  const redis = await getRedis();
  if (!redis) return stopInMemory(quizId);

  const prev = await readStored(quizId);
  if (!prev) return null;
  const session = fromStored(prev);
  session.isActive = false;
  const history = [...(prev.history ?? [])];
  const totals = computeTotals(session);
  const entry: ReactionSessionHistoryItem = {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
  };
  const nextHistory = [entry, ...history.filter((item) => item.id !== session.id)].slice(0, 30);
  const stored = toStored(session, nextHistory);
  await writeStored(stored);
  return toPublicFromStored(stored);
}

function reactionSignature(reactions: string[]): string {
  return reactions
    .map((item) => item.trim())
    .filter(Boolean)
    .join("||");
}

function resetSessionCountsInPlace(session: ReactionSessionInternal): void {
  session.counts = makeEmptyCounts(session.reactions);
  session.participantIds = new Set();
  session.reactionParticipantIds = makeEmptyReactionParticipantIds(session.reactions);
}

function filterHistoryByReactions(
  history: ReactionSessionHistoryItem[],
  reactions: string[],
): ReactionSessionHistoryItem[] {
  const signature = reactionSignature(reactions);
  return history.filter((item) => reactionSignature(item.reactions) !== signature);
}

function resetInMemoryForReactions(
  quizId: string,
  reactions: string[],
): ReactionSessionPublic | null {
  cleanupExpiredReactionsForQuiz(quizId, Date.now());
  const session = sessionsByQuiz.get(quizId);
  const signature = reactionSignature(normalizeReactionList(reactions));
  if (session && reactionSignature(session.reactions) === signature) {
    resetSessionCountsInPlace(session);
  }
  const prevHistory = historyByQuiz.get(quizId) ?? [];
  historyByQuiz.set(
    quizId,
    filterHistoryByReactions(prevHistory, normalizeReactionList(reactions)),
  );
  return getFromMemory(quizId);
}

/** Обнулить live-счётчики и историю сессий с тем же набором реакций. */
export async function resetReactionSessionCounts(
  quizId: string,
  reactions: string[],
): Promise<ReactionSessionPublic | null> {
  const normalized = normalizeReactionList(reactions);
  if (!useRedisStore()) return resetInMemoryForReactions(quizId, normalized);

  const redis = await getRedis();
  if (!redis) return resetInMemoryForReactions(quizId, normalized);

  const prev = await readStored(quizId);
  if (!prev) return null;
  const session = fromStored(prev);
  if (reactionSignature(session.reactions) === reactionSignature(normalized)) {
    resetSessionCountsInPlace(session);
  }
  const nextHistory = filterHistoryByReactions(prev.history ?? [], normalized);
  const stored = toStored(session, nextHistory);
  await writeStored(stored);
  return toPublicFromStored(stored);
}

export async function addReaction(
  quizId: string,
  participantId: string,
  reactionType: ReactionType,
): Promise<ReactionSessionPublic | null> {
  if (!useRedisStore()) return addInMemory(quizId, participantId, reactionType);

  const redis = await getRedis();
  if (!redis) return addInMemory(quizId, participantId, reactionType);

  const prev = await readStored(quizId);
  if (!prev) return null;
  const nowMs = Date.now();
  let stored = expireIfNeeded(prev, nowMs);
  if (stored !== prev) await writeStored(stored);
  if (!stored.isActive) return null;
  if (!stored.reactions.includes(reactionType)) return null;

  const session = fromStored(stored);
  session.counts[reactionType] = (session.counts[reactionType] ?? 0) + 1;
  session.participantIds.add(participantId);
  if (!session.reactionParticipantIds[reactionType]) {
    session.reactionParticipantIds[reactionType] = new Set();
  }
  session.reactionParticipantIds[reactionType]!.add(participantId);

  const history = [...(stored.history ?? [])];
  const totals = computeTotals(session);
  const entry: ReactionSessionHistoryItem = {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
  };
  const nextHistory = [entry, ...history.filter((item) => item.id !== session.id)].slice(0, 30);
  stored = toStored(session, nextHistory);
  await writeStored(stored);
  return toPublicFromStored(stored);
}
