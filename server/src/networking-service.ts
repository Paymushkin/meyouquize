import { createClient, type RedisClientType } from "redis";
import { normalizePublicViewState } from "@meyouquize/shared";
import { env } from "./env.js";
import { networkingPresenceMemberKey } from "./experiment-redis-keys.js";
import { logError, logWarn, formatErrorForLog } from "./logging.js";
import { extractLocalMediaFilename, localMediaUrlIfFileExists } from "./media-cleanup.js";
import { prisma } from "./prisma.js";
import { publicViewJsonToState } from "./socket/public-view-store.js";

/** Не отдавать клиенту битый /media/...; подчистить профиль в фоне. */
export function publicNetworkingAvatarUrl(
  avatarUrl: string | null | undefined,
  participantId?: string,
): string {
  const raw = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
  if (!raw) return "";
  const existing = localMediaUrlIfFileExists(raw);
  if (existing) return existing;
  if (participantId && extractLocalMediaFilename(raw)) {
    void prisma.participantProfile
      .updateMany({
        where: { participantId, avatarUrl: raw },
        data: { avatarUrl: "" },
      })
      .catch((err) => {
        logWarn("[networking] clear missing avatarUrl failed", formatErrorForLog(err));
      });
  }
  return "";
}

export function toPublicNetworkingProfile(
  profile: {
    fullName: string;
    jobTitle: string;
    company: string;
    avatarUrl: string;
    offers: string;
    seeking: string;
    visibleInDirectory: boolean;
  },
  participantId: string,
) {
  return {
    fullName: profile.fullName,
    jobTitle: profile.jobTitle,
    company: profile.company,
    avatarUrl: publicNetworkingAvatarUrl(profile.avatarUrl, participantId),
    offers: profile.offers,
    seeking: profile.seeking,
    visibleInDirectory: profile.visibleInDirectory,
  };
}

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
    jobTitle?: string;
    company?: string;
    avatarUrl?: string;
    offers?: string;
    seeking?: string;
    visibleInDirectory?: boolean;
  },
) {
  const existing = await prisma.participantProfile.findUnique({ where: { participantId } });
  const data = {
    fullName:
      typeof patch.fullName === "string"
        ? patch.fullName.trim().slice(0, 120)
        : (existing?.fullName ?? ""),
    jobTitle:
      typeof patch.jobTitle === "string"
        ? patch.jobTitle.trim().slice(0, 120)
        : (existing?.jobTitle ?? ""),
    company:
      typeof patch.company === "string"
        ? patch.company.trim().slice(0, 120)
        : (existing?.company ?? ""),
    avatarUrl:
      typeof patch.avatarUrl === "string"
        ? patch.avatarUrl.trim().slice(0, 500)
        : (existing?.avatarUrl ?? ""),
    offers:
      typeof patch.offers === "string"
        ? patch.offers.trim().slice(0, 500)
        : (existing?.offers ?? ""),
    seeking:
      typeof patch.seeking === "string"
        ? patch.seeking.trim().slice(0, 500)
        : (existing?.seeking ?? ""),
    visibleInDirectory:
      typeof patch.visibleInDirectory === "boolean"
        ? patch.visibleInDirectory
        : (existing?.visibleInDirectory ?? true),
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
      jobTitle: p.networkingProfile?.jobTitle ?? "",
      company: p.networkingProfile?.company ?? "",
      avatarUrl: publicNetworkingAvatarUrl(p.networkingProfile?.avatarUrl, p.id),
      offers: p.networkingProfile?.offers ?? "",
      seeking: p.networkingProfile?.seeking ?? "",
      online: online.has(p.id),
      hasProfile: Boolean(p.networkingProfile),
    }));

  if (q) {
    rows = rows.filter((r) => {
      if (viewerId && r.participantId === viewerId) return true;
      const hay =
        `${r.nickname} ${r.fullName} ${r.jobTitle} ${r.company} ${r.offers} ${r.seeking}`.toLocaleLowerCase(
          "ru",
        );
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

export async function listThreadsForParticipant(
  quizId: string,
  participantId: string,
  opts?: { limit?: number; offset?: number },
) {
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 20));
  const offset = Math.max(0, opts?.offset ?? 0);
  const where = {
    quizId,
    OR: [{ participantAId: participantId }, { participantBId: participantId }],
  };

  const [total, unreadTotal, threads] = await Promise.all([
    prisma.networkingThread.count({ where }),
    prisma.networkingMessage.count({
      where: {
        senderId: { not: participantId },
        readAt: null,
        thread: { quizId, OR: where.OR },
      },
    }),
    prisma.networkingThread.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        participantA: { select: { id: true, nickname: true, networkingProfile: true } },
        participantB: { select: { id: true, nickname: true, networkingProfile: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
  ]);

  const items = await Promise.all(
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
          avatarUrl: publicNetworkingAvatarUrl(peer.networkingProfile?.avatarUrl, peer.id),
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

  return {
    threads: items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
    unreadTotal,
  };
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

export type ProjectorGuestKind = "complete" | "incomplete";

type SpotlightGuestRow = {
  participantId: string;
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
};

function isCompleteNetworkingProfile(row: {
  nickname: string;
  fullName: string;
  offers: string;
  seeking: string;
}): boolean {
  const name = row.fullName.trim() || row.nickname.trim();
  return Boolean(name && row.offers.trim() && row.seeking.trim());
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Гости для ротации на проекторе (complete / incomplete offers|seeking). */
export async function listProjectorNetworkingGuests(
  quizId: string,
  opts: { kind: ProjectorGuestKind; limit: number; shuffle?: boolean },
): Promise<SpotlightGuestRow[]> {
  const limit = Math.max(1, Math.min(40, opts.limit));
  const participants = await prisma.participant.findMany({
    where: { quizId },
    include: { networkingProfile: true },
    orderBy: { createdAt: "asc" },
  });

  const rows: SpotlightGuestRow[] = participants
    .filter((p) => p.networkingProfile?.visibleInDirectory !== false)
    .map((p) => ({
      participantId: p.id,
      nickname: p.nickname,
      fullName: p.networkingProfile?.fullName ?? "",
      jobTitle: p.networkingProfile?.jobTitle ?? "",
      company: p.networkingProfile?.company ?? "",
      avatarUrl: publicNetworkingAvatarUrl(p.networkingProfile?.avatarUrl, p.id),
      offers: p.networkingProfile?.offers ?? "",
      seeking: p.networkingProfile?.seeking ?? "",
    }))
    .filter((r) => {
      const complete = isCompleteNetworkingProfile(r);
      return opts.kind === "complete" ? complete : !complete;
    });

  if (opts.shuffle === false) return rows.slice(0, limit);
  return shuffleInPlace(rows).slice(0, limit);
}

/**
 * Обновить список спотлайта без перетасовки: сохранить порядок prev,
 * обновить поля, дописать новых в конец.
 */
export function mergeProjectorSpotlightGuests(
  prev: SpotlightGuestRow[],
  nextPool: SpotlightGuestRow[],
  limit: number,
): SpotlightGuestRow[] {
  const capped = Math.max(1, Math.min(40, limit));
  const byId = new Map(nextPool.map((g) => [g.participantId, g]));
  const kept: SpotlightGuestRow[] = [];
  for (const g of prev) {
    const fresh = byId.get(g.participantId);
    if (fresh) kept.push(fresh);
  }
  const keptIds = new Set(kept.map((g) => g.participantId));
  const additions = nextPool.filter((g) => !keptIds.has(g.participantId));
  shuffleInPlace(additions);
  return [...kept, ...additions].slice(0, capped);
}

export type AdminNetworkingGuestRow = {
  participantId: string;
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
  visibleInDirectory: boolean;
  chatsCount: number;
  messagesCount: number;
};

/** Список гостей ивента для админки: профиль + число чатов/сообщений. */
export async function listAdminNetworkingGuests(
  quizId: string,
): Promise<AdminNetworkingGuestRow[]> {
  const participants = await prisma.participant.findMany({
    where: { quizId },
    include: {
      networkingProfile: true,
      _count: {
        select: {
          networkingThreadsAsA: true,
          networkingThreadsAsB: true,
          networkingMessagesSent: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return participants.map((p) => ({
    participantId: p.id,
    nickname: p.nickname,
    fullName: p.networkingProfile?.fullName ?? "",
    jobTitle: p.networkingProfile?.jobTitle ?? "",
    company: p.networkingProfile?.company ?? "",
    avatarUrl: publicNetworkingAvatarUrl(p.networkingProfile?.avatarUrl, p.id),
    offers: p.networkingProfile?.offers ?? "",
    seeking: p.networkingProfile?.seeking ?? "",
    visibleInDirectory: p.networkingProfile?.visibleInDirectory ?? true,
    chatsCount: p._count.networkingThreadsAsA + p._count.networkingThreadsAsB,
    messagesCount: p._count.networkingMessagesSent,
  }));
}

/** Админ правит текст профиля; avatarUrl не трогаем. */
export async function adminUpdateNetworkingGuest(
  quizId: string,
  participantId: string,
  patch: {
    nickname?: string;
    fullName?: string;
    jobTitle?: string;
    company?: string;
    offers?: string;
    seeking?: string;
    visibleInDirectory?: boolean;
  },
): Promise<AdminNetworkingGuestRow> {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, quizId },
    include: { networkingProfile: true },
  });
  if (!participant) throw new Error("Participant not found");

  if (typeof patch.nickname === "string") {
    const nick = patch.nickname.trim().slice(0, 80);
    if (!nick) throw new Error("Nickname required");
    await prisma.participant.update({
      where: { id: participantId },
      data: { nickname: nick },
    });
  }

  const existing = participant.networkingProfile;
  const fullName =
    typeof patch.fullName === "string"
      ? patch.fullName.trim().slice(0, 120)
      : (existing?.fullName ?? "");
  const jobTitle =
    typeof patch.jobTitle === "string"
      ? patch.jobTitle.trim().slice(0, 120)
      : (existing?.jobTitle ?? "");
  const company =
    typeof patch.company === "string"
      ? patch.company.trim().slice(0, 120)
      : (existing?.company ?? "");
  const offers =
    typeof patch.offers === "string" ? patch.offers.trim().slice(0, 500) : (existing?.offers ?? "");
  const seeking =
    typeof patch.seeking === "string"
      ? patch.seeking.trim().slice(0, 500)
      : (existing?.seeking ?? "");
  const visibleInDirectory =
    typeof patch.visibleInDirectory === "boolean"
      ? patch.visibleInDirectory
      : (existing?.visibleInDirectory ?? true);

  await prisma.participantProfile.upsert({
    where: { participantId },
    create: {
      participantId,
      fullName,
      jobTitle,
      company,
      offers,
      seeking,
      visibleInDirectory,
      avatarUrl: existing?.avatarUrl ?? "",
    },
    update: {
      fullName,
      jobTitle,
      company,
      offers,
      seeking,
      visibleInDirectory,
    },
  });

  const rows = await listAdminNetworkingGuests(quizId);
  const row = rows.find((r) => r.participantId === participantId);
  if (!row) throw new Error("Participant not found");
  return row;
}

/** Агрегаты нетворкинга для режима networking_stats. */
export async function getNetworkingQuizStats(quizId: string): Promise<{
  messages: number;
  guests: number;
  acquaintances: number;
}> {
  const [guests, acquaintances, messages] = await Promise.all([
    prisma.participant.count({
      where: {
        quizId,
        OR: [{ networkingProfile: null }, { networkingProfile: { visibleInDirectory: true } }],
      },
    }),
    prisma.networkingThread.count({ where: { quizId } }),
    prisma.networkingMessage.count({
      where: { thread: { quizId } },
    }),
  ]);
  return { messages, guests, acquaintances };
}
