/** Шаг плейлиста проектора (эксперимент; хранится в publicView JSON). */
export type ProjectorTimelineMode =
  | "title"
  | "question"
  | "leaderboard"
  | "speaker_questions"
  | "reactions"
  | "randomizer"
  | "photo_wall"
  | "video_wall"
  | "debate_compare"
  | "debate_series"
  | "networking_profiles"
  | "networking_stats"
  | "networking_incomplete"
  | "join_qr";

export type ProjectorTimelineStep = {
  id: string;
  mode: ProjectorTimelineMode;
  /** Для mode=question / debate_*: id сущности. */
  questionId?: string;
  debateCompareQuestionId?: string;
  debateSeriesId?: string;
  leaderboardSubQuizId?: string;
  durationSec: number;
};

export type ProjectorTimelineState = {
  /** Плейлист настроен (есть шаги). */
  enabled: boolean;
  /**
   * Derived-совместимость: sequencer крутит шаги, когда enabled && !frozen && !suppressed.
   * Клиентам лучше смотреть frozen/suppressed; playing сохраняем для старых payload.
   */
  playing: boolean;
  /** Держит cursor, не advance по durationSec. */
  frozen: boolean;
  /** Override интерактивом / Q&A — не advance и не перезапись mode. */
  suppressed: boolean;
  cursor: number;
  /** Unix ms начала текущего шага (сервер). */
  stepStartedAt: number | null;
  steps: ProjectorTimelineStep[];
};

/** Карточка гостя для ротации на проекторе. */
export type ProjectorNetworkingSpotlightGuest = {
  participantId: string;
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
};

/** Счётчики нетворкинга для режима `networking_stats`. */
export type ProjectorNetworkingStats = {
  messages: number;
  guests: number;
  acquaintances: number;
};

export const DEFAULT_JOIN_QR_TIMELINE_STEP: ProjectorTimelineStep = {
  id: "default-join-qr",
  mode: "join_qr",
  durationSec: 60,
};

export const DEFAULT_PROJECTOR_TIMELINE_STATE: ProjectorTimelineState = {
  enabled: true,
  playing: true,
  frozen: false,
  suppressed: false,
  cursor: 0,
  stepStartedAt: null,
  steps: [{ ...DEFAULT_JOIN_QR_TIMELINE_STEP }],
};

/** Длительность показа одного профиля внутри шага networking_*_profiles. */
export const PROJECTOR_NETWORKING_PROFILE_SLOT_SEC = 4;

/** Сколько профилей умещается в durationSec при слоте 4 с (минимум 1). */
export function networkingProfileSlotsForDuration(durationSec: number): number {
  const n = typeof durationSec === "number" && Number.isFinite(durationSec) ? durationSec : 10;
  return Math.max(
    1,
    Math.floor(Math.max(3, Math.min(600, Math.trunc(n))) / PROJECTOR_NETWORKING_PROFILE_SLOT_SEC),
  );
}

/** Таймлайн должен крутиться на sequencer (не freeze, не override). */
export function isProjectorTimelineAdvancing(timeline: ProjectorTimelineState): boolean {
  return timeline.enabled && timeline.steps.length > 0 && !timeline.frozen && !timeline.suppressed;
}

const TIMELINE_MODES = new Set<string>([
  "title",
  "question",
  "leaderboard",
  "speaker_questions",
  "reactions",
  "randomizer",
  "photo_wall",
  "video_wall",
  "debate_compare",
  "debate_series",
  "networking_profiles",
  "networking_stats",
  "networking_incomplete",
  "join_qr",
]);

/** Режимы плейлиста в админке (остальные при sanitize → networking_profiles). */
export const PROJECTOR_PLAYLIST_MODES = new Set<ProjectorTimelineMode>([
  "networking_profiles",
  "networking_stats",
  "networking_incomplete",
  "join_qr",
  "photo_wall",
  "video_wall",
]);

function clampDurationSec(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(3, Math.min(600, Math.trunc(n)));
}

function sanitizeStep(raw: unknown, index: number): ProjectorTimelineStep | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const mode = row.mode;
  if (typeof mode !== "string" || !TIMELINE_MODES.has(mode)) return null;
  // title/question/… в плейлисте выглядят в UI как «Профиль гостя», но на экране
  // остаются собой — нормализуем к режимам админ-плейлиста.
  const playlistMode = PROJECTOR_PLAYLIST_MODES.has(mode as ProjectorTimelineMode)
    ? (mode as ProjectorTimelineMode)
    : "networking_profiles";
  const id =
    typeof row.id === "string" && row.id.trim().length > 0
      ? row.id.trim().slice(0, 80)
      : `step-${index}`;
  return {
    id,
    mode: playlistMode,
    ...(typeof row.questionId === "string" && row.questionId.trim()
      ? { questionId: row.questionId.trim().slice(0, 80) }
      : {}),
    ...(typeof row.debateCompareQuestionId === "string" && row.debateCompareQuestionId.trim()
      ? { debateCompareQuestionId: row.debateCompareQuestionId.trim().slice(0, 80) }
      : {}),
    ...(typeof row.debateSeriesId === "string" && row.debateSeriesId.trim()
      ? { debateSeriesId: row.debateSeriesId.trim().slice(0, 80) }
      : {}),
    ...(typeof row.leaderboardSubQuizId === "string" && row.leaderboardSubQuizId.trim()
      ? { leaderboardSubQuizId: row.leaderboardSubQuizId.trim().slice(0, 80) }
      : {}),
    durationSec: clampDurationSec(row.durationSec),
  };
}

export function normalizeProjectorTimelineState(
  value: unknown,
  fallback: ProjectorTimelineState = DEFAULT_PROJECTOR_TIMELINE_STATE,
): ProjectorTimelineState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ...fallback,
      steps: fallback.steps.map((s) => ({ ...s })),
    };
  }
  const row = value as Record<string, unknown>;
  const rawSteps = Array.isArray(row.steps) ? row.steps : [];
  let steps = rawSteps
    .map((item, index) => sanitizeStep(item, index))
    .filter((item): item is ProjectorTimelineStep => item != null)
    .slice(0, 100);
  // Пустой плейлист → дефолтный QR.
  if (steps.length === 0) {
    steps = [{ ...DEFAULT_JOIN_QR_TIMELINE_STEP }];
  }
  const cursorRaw = typeof row.cursor === "number" ? Math.trunc(row.cursor) : fallback.cursor;
  const cursor = Math.max(0, Math.min(steps.length - 1, cursorRaw));
  const frozen = typeof row.frozen === "boolean" ? row.frozen : false;
  const suppressed = typeof row.suppressed === "boolean" ? row.suppressed : false;
  const enabled = typeof row.enabled === "boolean" ? row.enabled : true;
  const playing =
    typeof row.playing === "boolean"
      ? row.playing
      : enabled && !frozen && !suppressed && steps.length > 0;
  return {
    enabled,
    playing,
    frozen,
    suppressed,
    cursor,
    stepStartedAt:
      typeof row.stepStartedAt === "number" && Number.isFinite(row.stepStartedAt)
        ? Math.trunc(row.stepStartedAt)
        : null,
    steps,
  };
}

/** Тонкий patch publicView для применения шага плейлиста. */
export function projectorTimelineStepToPublicViewPatch(
  step: ProjectorTimelineStep,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { mode: step.mode };
  if (step.mode === "question" && step.questionId) {
    patch.questionId = step.questionId;
  }
  if (step.mode === "debate_compare") {
    if (step.questionId) patch.questionId = step.questionId;
    if (step.debateCompareQuestionId) {
      patch.debateCompareQuestionId = step.debateCompareQuestionId;
    }
  }
  if (step.mode === "debate_series" && step.debateSeriesId) {
    patch.debateSeriesId = step.debateSeriesId;
  }
  if (step.mode === "leaderboard" && step.leaderboardSubQuizId) {
    patch.leaderboardSubQuizId = step.leaderboardSubQuizId;
  }
  return patch;
}

export function sanitizeProjectorNetworkingSpotlightGuests(
  value: unknown,
): ProjectorNetworkingSpotlightGuest[] {
  if (!Array.isArray(value)) return [];
  const out: ProjectorNetworkingSpotlightGuest[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const participantId =
      typeof row.participantId === "string" ? row.participantId.trim().slice(0, 80) : "";
    if (!participantId) continue;
    out.push({
      participantId,
      nickname: typeof row.nickname === "string" ? row.nickname.trim().slice(0, 80) : "",
      fullName: typeof row.fullName === "string" ? row.fullName.trim().slice(0, 120) : "",
      jobTitle: typeof row.jobTitle === "string" ? row.jobTitle.trim().slice(0, 120) : "",
      company: typeof row.company === "string" ? row.company.trim().slice(0, 120) : "",
      avatarUrl: typeof row.avatarUrl === "string" ? row.avatarUrl.trim().slice(0, 500) : "",
      offers: typeof row.offers === "string" ? row.offers.trim().slice(0, 500) : "",
      seeking: typeof row.seeking === "string" ? row.seeking.trim().slice(0, 500) : "",
    });
    if (out.length >= 40) break;
  }
  return out;
}

export function sanitizeProjectorNetworkingStats(value: unknown): ProjectorNetworkingStats {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const clamp = (n: unknown) => {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v) || v < 0) return 0;
    return Math.min(1_000_000_000, Math.trunc(v));
  };
  return {
    messages: clamp(row.messages),
    guests: clamp(row.guests),
    acquaintances: clamp(row.acquaintances),
  };
}
