import { createClient, type RedisClientType } from "redis";
import { normalizePublicViewState } from "@meyouquize/shared";
import { env } from "./env.js";
import { networkingPresenceMemberKey } from "./experiment-redis-keys.js";
import { logError, logWarn, formatErrorForLog } from "./logging.js";
import { prisma } from "./prisma.js";
import { publicViewJsonToState } from "./socket/public-view-store.js";

const PRESENCE_TTL_SEC = 45;
const MAX_MESSAGE_LEN = 2000;

let redis: RedisClientType | null = null;
let redisConnect: Promise<RedisClientType | null> | null = null;
const localPresence = new Map<string, Map<string, number>>();

async function getRedis(): Promise<RedisClientType | null> {
  if (!env.redisUrl) return null;
  if (redis?.isOpen) return redis;
  if (redisConnect) return redisConnect;
  redisConnect = (async () => {
    const next = createClient({ url: env.redisUrl });
    next.on("error", (err) => logError("[networking redis]", err));
    try {
      await next.connect();
      redis = next as RedisClientType;
      return redis;
    } catch (err) {
      logWarn("[networking redis] connect failed", formatErrorForLog(err));
      redisConnect = null;
      return null;
    }
  })();
  return redisConnect;
}

export async function isNetworkingEnabledForQuiz(quizId: string): Promise<boolean> {
  const row = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { publicView: true },
  });
  const view = publicViewJsonToState(row?.publicView ?? null);
  return Boolean(view.networkingEnabled);
}

export async function assertNetworkingEnabled(quizId: string): Promise<void> {
  if (!(await isNetworkingEnabledForQuiz(quizId))) {
    throw new Error("Networking is disabled for this event");
  }
}

export async function touchNetworkingPresence(
  quizId: string,
  participantId: string,
): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.set(networkingPresenceMemberKey(quizId, participantId), "1", {
      EX: PRESENCE_TTL_SEC,
    });
    return;
  }
  let map = localPresence.get(quizId);
  if (!map) {
    map = new Map();
    localPresence.set(quizId, map);
  }
  map.set(participantId, Date.now() + PRESENCE_TTL_SEC * 1000);
}

export async function listOnlineParticipantIds(quizId: string): Promise<string[]> {
  const client = await getRedis();
  if (client) {
    const keys: string[] = [];
    for await (const key of client.scanIterator({
      MATCH: networkingPresenceMemberKey(quizId, "*"),
      COUNT: 100,
    })) {
      keys.push(String(key));
    }
    const prefix = networkingPresenceMemberKey(quizId, "");
    return keys.map((k) => k.slice(prefix.length)).filter(Boolean);
  }
  const map = localPresence.get(quizId);
  if (!map) return [];
  const now = Date.now();
  const alive: string[] = [];
  for (const [id, exp] of map) {
    if (exp > now) alive.push(id);
    else map.delete(id);
  }
  return alive;
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function upsertParticipantProfile(
  participantId: string,
  patch: {
    fullName?: string;
    company?: string;
    avatarUrl?: string;
    offers?: string;
    seeking?: string;
    visibleInDirectory?: boolean;
  },
) {
  const data = {
    fullName: (patch.fullName ?? "").trim().slice(0, 120),
    company: (patch.company ?? "").trim().slice(0, 120),
    avatarUrl: (patch.avatarUrl ?? "").trim().slice(0, 500),
    offers: (patch.offers ?? "").trim().slice(0, 500),
    seeking: (patch.seeking ?? "").trim().slice(0, 500),
    visibleInDirectory: patch.visibleInDirectory ?? true,
  };
  return prisma.participantProfile.upsert({
    where: { participantId },
    create: { participantId, ...data },
    update: data,
  });
}

export async function getParticipantProfile(participantId: string) {
  return prisma.participantProfile.findUnique({ where: { participantId } });
}

export async function listNetworkingGuests(input: {
  quizId: string;
  query?: string;
  limit?: number;
  offset?: number;
  onlineIds?: string[];
  /** Свой профиль всегда в списке и первым. */
  viewerParticipantId?: string;
}) {
  const limit = Math.max(1, Math.min(50, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const q = (input.query ?? "").trim().toLocaleLowerCase("ru");
  const viewerId = input.viewerParticipantId?.trim() || "";

  const participants = await prisma.participant.findMany({
    where: { quizId: input.quizId },
    include: { networkingProfile: true },
    orderBy: { createdAt: "asc" },
  });

  const online = new Set(input.onlineIds ?? []);
  let rows = participants
    .filter((p) => {
      if (viewerId && p.id === viewerId) return true;
      return p.networkingProfile?.visibleInDirectory !== false;
    })
    .map((p) => ({
      participantId: p.id,
      nickname: p.nickname,
      fullName: p.networkingProfile?.fullName ?? "",
      company: p.networkingProfile?.company ?? "",
      avatarUrl: p.networkingProfile?.avatarUrl ?? "",
      offers: p.networkingProfile?.offers ?? "",
      seeking: p.networkingProfile?.seeking ?? "",
      online: online.has(p.id),
      hasProfile: Boolean(p.networkingProfile),
    }));

  if (q) {
    rows = rows.filter((r) => {
      if (viewerId && r.participantId === viewerId) return true;
      const hay =
        `${r.nickname} ${r.fullName} ${r.company} ${r.offers} ${r.seeking}`.toLocaleLowerCase("ru");
      return hay.includes(q);
    });
  }

  if (viewerId) {
    const selfIdx = rows.findIndex((r) => r.participantId === viewerId);
    if (selfIdx > 0) {
      const [self] = rows.splice(selfIdx, 1);
      rows.unshift(self!);
    }
  }

  const total = rows.length;
  return { total, guests: rows.slice(offset, offset + limit) };
}

export async function assertParticipantsInQuiz(
  quizId: string,
  participantIds: string[],
): Promise<void> {
  const unique = [...new Set(participantIds.filter(Boolean))];
  if (unique.length === 0) throw new Error("Participant not found");
  const rows = await prisma.participant.findMany({
    where: { quizId, id: { in: unique } },
    select: { id: true },
  });
  if (rows.length !== unique.length) {
    throw new Error("Participant not found");
  }
}

export async function getOrCreateThread(quizId: string, aId: string, bId: string) {
  if (aId === bId) throw new Error("Cannot chat with yourself");
  const senderOk = await prisma.participant.findFirst({
    where: { id: aId, quizId },
    select: { id: true },
  });
  if (!senderOk) throw new Error("Participant not found");
  const peerOk = await prisma.participant.findFirst({
    where: { id: bId, quizId },
    select: { id: true },
  });
  if (!peerOk) throw new Error("Guest not found");
  const [participantAId, participantBId] = orderedPair(aId, bId);
  const existing = await prisma.networkingThread.findUnique({
    where: {
      quizId_participantAId_participantBId: { quizId, participantAId, participantBId },
    },
  });
  if (existing) return existing;
  return prisma.networkingThread.create({
    data: { quizId, participantAId, participantBId },
  });
}

export async function listThreadsForParticipant(quizId: string, participantId: string) {
  const threads = await prisma.networkingThread.findMany({
    where: {
      quizId,
      OR: [{ participantAId: participantId }, { participantBId: participantId }],
    },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      participantA: { select: { id: true, nickname: true, networkingProfile: true } },
      participantB: { select: { id: true, nickname: true, networkingProfile: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    threads.map(async (t) => {
      const peer = t.participantAId === participantId ? t.participantB : t.participantA;
      const unread = await prisma.networkingMessage.count({
        where: {
          threadId: t.id,
          senderId: { not: participantId },
          readAt: null,
        },
      });
      const last = t.messages[0] ?? null;
      return {
        threadId: t.id,
        peer: {
          participantId: peer.id,
          nickname: peer.nickname,
          fullName: peer.networkingProfile?.fullName ?? "",
          avatarUrl: peer.networkingProfile?.avatarUrl ?? "",
        },
        lastMessage: last
          ? {
              id: last.id,
              text: last.text,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
        unread,
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
  );
}

export async function sendNetworkingMessage(input: {
  quizId: string;
  senderId: string;
  peerId: string;
  text: string;
}) {
  const text = input.text.trim().slice(0, MAX_MESSAGE_LEN);
  if (!text) throw new Error("Empty message");
  const thread = await getOrCreateThread(input.quizId, input.senderId, input.peerId);
  const message = await prisma.networkingMessage.create({
    data: { threadId: thread.id, senderId: input.senderId, text },
  });
  await prisma.networkingThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });
  return { thread, message };
}

export async function listThreadMessages(input: {
  threadId: string;
  participantId: string;
  limit?: number;
  before?: string;
}) {
  const thread = await prisma.networkingThread.findUnique({ where: { id: input.threadId } });
  if (!thread) throw new Error("Thread not found");
  if (
    thread.participantAId !== input.participantId &&
    thread.participantBId !== input.participantId
  ) {
    throw new Error("Forbidden");
  }
  const limit = Math.max(1, Math.min(100, input.limit ?? 40));
  const messages = await prisma.networkingMessage.findMany({
    where: {
      threadId: input.threadId,
      ...(input.before ? { createdAt: { lt: new Date(input.before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return messages.reverse().map((m) => ({
    id: m.id,
    threadId: m.threadId,
    senderId: m.senderId,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));
}

export async function markThreadRead(threadId: string, readerId: string) {
  await prisma.networkingMessage.updateMany({
    where: { threadId, senderId: { not: readerId }, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Re-export for tests / admin toggles that merge publicView. */
export function networkingEnabledFromUnknown(view: unknown): boolean {
  return Boolean(normalizePublicViewState(view as never).networkingEnabled);
}
