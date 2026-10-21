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
  | "debate_series";

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
  /** Плейлист настроен (можно play). */
  enabled: boolean;
  /** Sequencer сейчас крутит шаги на сервере. */
  playing: boolean;
  cursor: number;
  /** Unix ms начала текущего шага (сервер). */
  stepStartedAt: number | null;
  steps: ProjectorTimelineStep[];
};

export const DEFAULT_PROJECTOR_TIMELINE_STATE: ProjectorTimelineState = {
  enabled: false,
  playing: false,
  cursor: 0,
  stepStartedAt: null,
  steps: [],
};

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
  const id =
    typeof row.id === "string" && row.id.trim().length > 0
      ? row.id.trim().slice(0, 80)
      : `step-${index}`;
  return {
    id,
    mode: mode as ProjectorTimelineMode,
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
    return { ...fallback, steps: [...fallback.steps] };
  }
  const row = value as Record<string, unknown>;
  const rawSteps = Array.isArray(row.steps) ? row.steps : [];
  const steps = rawSteps
    .map((item, index) => sanitizeStep(item, index))
    .filter((item): item is ProjectorTimelineStep => item != null)
    .slice(0, 100);
  const cursorRaw = typeof row.cursor === "number" ? Math.trunc(row.cursor) : fallback.cursor;
  const cursor = steps.length === 0 ? 0 : Math.max(0, Math.min(steps.length - 1, cursorRaw));
  return {
    enabled: typeof row.enabled === "boolean" ? row.enabled : fallback.enabled,
    playing: typeof row.playing === "boolean" ? row.playing : fallback.playing,
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
