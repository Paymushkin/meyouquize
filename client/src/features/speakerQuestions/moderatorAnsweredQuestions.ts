const STORAGE_PREFIX = "mq_speaker_mod_answered_";

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  return null;
}

export function readModeratorAnsweredIds(scope: string): string[] {
  if (!scope) return [];
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${scope}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writeModeratorAnsweredIds(scope: string, ids: string[]): void {
  if (!scope) return;
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${scope}`, JSON.stringify(ids));
  } catch {
    // ignore private mode / quota
  }
}

/** Активные сверху (исходный порядок), отвеченные — внизу. */
export function sortModeratorQuestionsByAnswered<T extends { id: string }>(
  items: T[],
  answeredIds: ReadonlySet<string>,
): T[] {
  if (answeredIds.size === 0) return items;
  const active: T[] = [];
  const answered: T[] = [];
  for (const item of items) {
    if (answeredIds.has(item.id)) answered.push(item);
    else active.push(item);
  }
  return [...active, ...answered];
}
