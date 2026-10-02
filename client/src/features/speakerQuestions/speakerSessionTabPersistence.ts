const STORAGE_PREFIX = "mq_speaker_session_tab_";

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  return null;
}

export function readSpeakerSessionTab(scope: string): string | null {
  if (!scope) return null;
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    return storage.getItem(`${STORAGE_PREFIX}${scope}`);
  } catch {
    return null;
  }
}

export function writeSpeakerSessionTab(scope: string, tabId: string): void {
  if (!scope || !tabId) return;
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${scope}`, tabId);
  } catch {
    // ignore private mode / quota
  }
}

/** Сохранённая вкладка, если она есть в списке; иначе первая в списке; иначе fallback. */
export function resolveSpeakerSessionTab(
  tabIds: string[],
  current: string,
  scope: string,
  fallback: string,
): string {
  if (tabIds.length === 0) return current || fallback;
  if (current && tabIds.includes(current)) return current;
  const stored = readSpeakerSessionTab(scope);
  if (stored && tabIds.includes(stored)) return stored;
  // По умолчанию — первая вкладка в списке (сессии идут раньше «Все»).
  return tabIds[0] ?? fallback;
}
