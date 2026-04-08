import { prisma } from "./prisma.js";

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
