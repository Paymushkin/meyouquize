/** Сессия вопросов спикерам: свой список адресов и имя для вкладок. */
export type SpeakerQuestionSession = {
  id: string;
  name: string;
  speakers: string[];
};

export const DEFAULT_SPEAKER_SESSION_NAME = "Основная";
/** Стабильный id при миграции legacy `speakerQuestionsSpeakers` → одна сессия. */
export const LEGACY_DEFAULT_SPEAKER_SESSION_ID = "legacy-default";

const MAX_SESSIONS = 40;
const MAX_SPEAKERS_PER_SESSION = 100;
const MAX_SESSION_NAME = 80;
const MAX_SPEAKER_NAME = 80;

export function createSpeakerSessionId(): string {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeSpeakers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_SPEAKER_NAME))
    .filter((item) => item.length > 0)
    .slice(0, MAX_SPEAKERS_PER_SESSION);
}

function sanitizeSession(raw: unknown): SpeakerQuestionSession | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim().slice(0, 80) : "";
  if (!id) return null;
  const nameRaw = typeof row.name === "string" ? row.name.trim().slice(0, MAX_SESSION_NAME) : "";
  const name = nameRaw || DEFAULT_SPEAKER_SESSION_NAME;
  return { id, name, speakers: sanitizeSpeakers(row.speakers) };
}

/**
 * Нормализует сессии и активный id.
 * Legacy: пустые sessions + непустой speakers → одна сессия «Основная».
 * speakers (derived) = спикеры активной сессии.
 */
export function normalizeSpeakerQuestionSessions(input: {
  sessions?: unknown;
  activeSpeakerSessionId?: unknown;
  /** Legacy / fallback list (`speakerQuestionsSpeakers`). */
  speakers?: unknown;
}): {
  sessions: SpeakerQuestionSession[];
  activeSpeakerSessionId: string | null;
  speakers: string[];
} {
  let sessions = Array.isArray(input.sessions)
    ? input.sessions
        .map(sanitizeSession)
        .filter((s): s is SpeakerQuestionSession => s != null)
        .slice(0, MAX_SESSIONS)
    : [];

  const legacySpeakers = sanitizeSpeakers(input.speakers);

  if (sessions.length === 0 && legacySpeakers.length > 0) {
    sessions = [
      {
        id: LEGACY_DEFAULT_SPEAKER_SESSION_ID,
        name: DEFAULT_SPEAKER_SESSION_NAME,
        speakers: legacySpeakers,
      },
    ];
  }

  // Dedup by id (keep first)
  const seen = new Set<string>();
  sessions = sessions.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  let activeId =
    typeof input.activeSpeakerSessionId === "string" && input.activeSpeakerSessionId.trim()
      ? input.activeSpeakerSessionId.trim()
      : null;

  if (activeId && !sessions.some((s) => s.id === activeId)) {
    activeId = null;
  }
  if (!activeId && sessions.length > 0) {
    activeId = sessions[0]!.id;
  }
  if (sessions.length === 0) {
    activeId = null;
  }

  const active = activeId ? sessions.find((s) => s.id === activeId) : undefined;
  const speakers = active ? [...active.speakers] : legacySpeakers.length > 0 ? legacySpeakers : [];

  return {
    sessions,
    activeSpeakerSessionId: activeId,
    speakers,
  };
}

export function findSpeakerSessionName(
  sessions: readonly SpeakerQuestionSession[],
  sessionId: string | null | undefined,
): string | null {
  if (!sessionId) return null;
  return sessions.find((s) => s.id === sessionId)?.name ?? null;
}

export type SpeakerQuestionSessionGroup<T extends { sessionId?: string | null }> = {
  sessionId: string | null;
  sessionName: string;
  items: T[];
};

/** Группы в порядке сессий из настроек; неизвестные и без сессии — в конце. */
export function groupSpeakerQuestionsBySession<
  T extends { sessionId?: string | null; sessionName?: string | null },
>(
  items: readonly T[],
  sessions: readonly SpeakerQuestionSession[],
): SpeakerQuestionSessionGroup<T>[] {
  const byId = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.sessionId ?? null;
    const list = byId.get(key);
    if (list) list.push(item);
    else byId.set(key, [item]);
  }

  const groups: SpeakerQuestionSessionGroup<T>[] = [];
  const seen = new Set<string | null>();

  for (const session of sessions) {
    const list = byId.get(session.id);
    if (!list || list.length === 0) continue;
    groups.push({ sessionId: session.id, sessionName: session.name, items: list });
    seen.add(session.id);
  }

  for (const [sessionId, list] of byId) {
    if (seen.has(sessionId) || list.length === 0) continue;
    const nameFromItem = list.find((row) => row.sessionName?.trim())?.sessionName?.trim();
    groups.push({
      sessionId,
      sessionName: sessionId == null ? "Без сессии" : nameFromItem || sessionId,
      items: list,
    });
  }

  return groups;
}
