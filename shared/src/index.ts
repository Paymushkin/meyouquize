export type QuestionType = "single" | "multi" | "tag_cloud";
export type QuizStatus = "draft" | "live" | "finished";

export interface OptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  text: string;
  type: QuestionType;
  points: number;
  maxAnswers?: number;
  options: OptionInput[];
}

export interface CreateQuizPayload {
  title: string;
  questions: QuestionInput[];
}

export interface QuizJoinPayload {
  slug: string;
  nickname: string;
  deviceId: string;
}

export interface SubmitAnswerPayload {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  tagAnswers?: string[];
}

export type PublicViewMode = "title" | "question" | "leaderboard";

export type CloudWordCount = { text: string; count: number };

export interface PublicViewState {
  mode: PublicViewMode;
  questionId?: string;
  highlightedLeadersCount: number;
  showVoteCount: boolean;
  showQuestionTitle: boolean;
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  cloudDensity: number;
  cloudTagPadding: number;
  cloudSpiral: "archimedean" | "rectangular";
  cloudAnimationStrength: number;
  /** Обычное голосование: стиль столбиков */
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  /** Для голосований комнаты: показывать на проекторе ники первых верно ответивших */
  showFirstCorrectAnswerer: boolean;
  /** Сколько первых верных ответов показать (1–20), если showFirstCorrectAnswerer */
  firstCorrectWinnersCount: number;
}

export interface PublicViewPayload extends PublicViewState {
  title?: string;
}

export type PublicViewPatch = Partial<PublicViewState> & {
  mode?: PublicViewMode;
  questionId?: string;
};

export const DEFAULT_PUBLIC_VIEW_STATE: PublicViewState = {
  mode: "title",
  highlightedLeadersCount: 3,
  showVoteCount: true,
  showQuestionTitle: true,
  hiddenTagTexts: [],
  injectedTagWords: [],
  tagCountOverrides: [],
  projectorBackground: "#7c5acb",
  cloudQuestionColor: "#1f1f1f",
  cloudTagColors: ["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"],
  cloudTopTagColor: "#d32f2f",
  cloudDensity: 60,
  cloudTagPadding: 5,
  cloudSpiral: "archimedean",
  cloudAnimationStrength: 30,
  voteQuestionTextColor: "#1f1f1f",
  voteOptionTextColor: "#1f1f1f",
  voteProgressTrackColor: "#e3e3e3",
  voteProgressBarColor: "#1976d2",
  showFirstCorrectAnswerer: false,
  firstCorrectWinnersCount: 1,
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function sanitizeCloudWords(items: CloudWordCount[] | undefined, minCount: number): CloudWordCount[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.text === "string" && item.text.trim().length > 0)
    .map((item) => ({
      text: item.text.trim().slice(0, 120),
      count: clampInt(item.count, minCount, 100000),
    }));
}

function sanitizeHex6(value: string | undefined, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())) return value.trim();
  return fallback;
}

function sanitizePalette(colors: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(colors) || colors.length !== 5) return [...fallback];
  return colors.map((color, index) => {
    if (typeof color !== "string" || color.trim().length === 0) return fallback[index] ?? fallback[0] ?? "#1f1f1f";
    return color;
  });
}

export function normalizePublicViewState(value: Partial<PublicViewState> | undefined): PublicViewState {
  const base = DEFAULT_PUBLIC_VIEW_STATE;
  const mode = value?.mode === "question" || value?.mode === "leaderboard" || value?.mode === "title"
    ? value.mode
    : base.mode;
  const rawQuestionId =
    typeof value?.questionId === "string" && value.questionId.trim() ? value.questionId.trim() : undefined;
  const questionId = mode === "question" ? rawQuestionId : undefined;
  return {
    mode,
    questionId,
    highlightedLeadersCount: clampInt(value?.highlightedLeadersCount ?? base.highlightedLeadersCount, 0, 100),
    showVoteCount: typeof value?.showVoteCount === "boolean" ? value.showVoteCount : base.showVoteCount,
    showQuestionTitle: typeof value?.showQuestionTitle === "boolean" ? value.showQuestionTitle : base.showQuestionTitle,
    hiddenTagTexts: Array.isArray(value?.hiddenTagTexts)
      ? value.hiddenTagTexts.filter((item) => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 120))
      : [...base.hiddenTagTexts],
    injectedTagWords: sanitizeCloudWords(value?.injectedTagWords, 1),
    tagCountOverrides: sanitizeCloudWords(value?.tagCountOverrides, 0),
    projectorBackground: sanitizeHex6(value?.projectorBackground, base.projectorBackground),
    cloudQuestionColor: sanitizeHex6(value?.cloudQuestionColor, base.cloudQuestionColor),
    cloudTagColors: sanitizePalette(value?.cloudTagColors, base.cloudTagColors),
    cloudTopTagColor: sanitizeHex6(value?.cloudTopTagColor, base.cloudTopTagColor),
    cloudDensity: clampInt(value?.cloudDensity ?? base.cloudDensity, 0, 100),
    cloudTagPadding: clampInt(value?.cloudTagPadding ?? base.cloudTagPadding, 0, 40),
    cloudSpiral: value?.cloudSpiral === "rectangular" || value?.cloudSpiral === "archimedean"
      ? value.cloudSpiral
      : base.cloudSpiral,
    cloudAnimationStrength: clampInt(value?.cloudAnimationStrength ?? base.cloudAnimationStrength, 0, 100),
    voteQuestionTextColor: sanitizeHex6(value?.voteQuestionTextColor, base.voteQuestionTextColor),
    voteOptionTextColor: sanitizeHex6(value?.voteOptionTextColor, base.voteOptionTextColor),
    voteProgressTrackColor: sanitizeHex6(value?.voteProgressTrackColor, base.voteProgressTrackColor),
    voteProgressBarColor: sanitizeHex6(value?.voteProgressBarColor, base.voteProgressBarColor),
    showFirstCorrectAnswerer:
      typeof value?.showFirstCorrectAnswerer === "boolean" ? value.showFirstCorrectAnswerer : base.showFirstCorrectAnswerer,
    firstCorrectWinnersCount: clampInt(
      value?.firstCorrectWinnersCount ?? base.firstCorrectWinnersCount,
      1,
      20,
    ),
  };
}

export function mergePublicViewState(prev: PublicViewState, patch: PublicViewPatch): PublicViewState {
  const merged = normalizePublicViewState({ ...prev, ...patch });
  const nextMode = merged.mode;

  if (nextMode !== "question") {
    merged.questionId = undefined;
    return merged;
  }

  /** Явный непустой id в патче перезаписывает; иначе оставляем merged.questionId из normalize({ ...prev, ...patch }). */
  if (typeof patch.questionId === "string" && patch.questionId.trim()) {
    merged.questionId = patch.questionId.trim();
  }
  return merged;
}
