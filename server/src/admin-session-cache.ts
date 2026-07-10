import { prisma } from "./prisma.js";
import { Prisma } from "@prisma/client";

const CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 256;

type CacheEntry = { valid: boolean; cachedAt: number };

const cache = new Map<string, CacheEntry>();

function pruneIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;
  const drop = cache.size - MAX_ENTRIES + 32;
  const keys = [...cache.keys()].slice(0, drop);
  for (const k of keys) cache.delete(k);
}

/** Проверка cookie-токена админа без запроса в БД на каждый reconnect. */
export async function isAdminTokenValid(token: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(token);
  if (hit && now - hit.cachedAt < CACHE_TTL_MS) {
    return hit.valid;
  }
  const session = await prisma.adminSession.findUnique({ where: { token } });
  const valid = !!(session && session.expiresAt > new Date());
  cache.set(token, { valid, cachedAt: now });
  pruneIfNeeded();
  return valid;
}

export async function getAdminSessionWithUser(token: string) {
  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: {
        adminUser: {
          select: {
            id: true,
            login: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    if (session.adminUser && !session.adminUser.isActive) return null;
    return session;
  } catch (error) {
    // Во время постепенного rollout миграций поле/таблица admin users может отсутствовать.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const fallback = await prisma.adminSession.findUnique({ where: { token } });
      if (!fallback || fallback.expiresAt <= new Date()) return null;
      return { ...fallback, adminUser: null };
    }
    throw error;
  }
}
