import { resolveMultiMaxAnswers } from "@meyouquize/shared";

export const FEEDBACK_SCALE_MIN_OPTIONS = 2;
export const FEEDBACK_SCALE_MAX_OPTIONS = 10;
export const FEEDBACK_OPEN_FIELD_MAX = 10;

export type FeedbackScaleSelection = "single" | "multi";

export type FeedbackScale = {
  id: string;
  label: string;
  options: string[];
  /** По умолчанию single (шкала). multi — несколько вариантов с лимитом. */
  selection?: FeedbackScaleSelection;
  /** Для multi: сколько вариантов может выбрать игрок. */
  maxAnswers?: number;
};

export type FeedbackScaleAnswerValue = number | number[];
export type FeedbackScaleAnswers = Record<string, FeedbackScaleAnswerValue>;

export type FeedbackOpenField = {
  id: string;
  label: string;
  placeholder: string;
};

export type FeedbackFormConfig = {
  id: string;
  quizId: string;
  title: string;
  isActive: boolean;
  isClosed: boolean;
  scales: FeedbackScale[];
  openFields: FeedbackOpenField[];
  /** @deprecated use openFields */
  commentEnabled: boolean;
  /** @deprecated use openFields */
  commentPlaceholder: string;
};

export type ActiveFeedbackForm = {
  id: string;
  title: string;
  scales: FeedbackScale[];
  openFields: FeedbackOpenField[];
  /** @deprecated use openFields */
  commentEnabled: boolean;
  /** @deprecated use openFields */
  commentPlaceholder: string;
  isClosed: boolean;
  activatedAt?: string | null;
};

export type FeedbackScaleStat = {
  scaleId: string;
  label: string;
  options: FeedbackScale["options"];
  counts: number[];
  average: number | null;
  responseCount: number;
};

export type FeedbackScaleCountOverride = {
  text: string;
  count: number;
};

export function feedbackScaleOptionKey(scaleId: string, optionIndex: number): string {
  return `${scaleId}:${optionIndex}`;
}

export function isFeedbackScaleMulti(scale: Pick<FeedbackScale, "selection">): boolean {
  return scale.selection === "multi";
}

export function resolveFeedbackMultiMaxAnswers(scale: FeedbackScale): number {
  return resolveMultiMaxAnswers(scale.maxAnswers, scale.options.length, FEEDBACK_SCALE_MAX_OPTIONS);
}

export function normalizeFeedbackScaleAnswer(value: unknown): number | number[] | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (!Array.isArray(value)) return undefined;
  const indexes = value
    .filter((item): item is number => typeof item === "number" && Number.isInteger(item))
    .map((item) => Math.trunc(item));
  return indexes.length > 0 ? indexes : undefined;
}

export type FeedbackResultsPayload = {
  form: FeedbackFormConfig;
  responseCount: number;
  scaleCountOverrides?: FeedbackScaleCountOverride[];
  scaleStats: FeedbackScaleStat[];
  responses: Array<{
    nickname: string;
    scaleAnswers: FeedbackScaleAnswers;
    openFieldAnswers: Record<string, string>;
    /** @deprecated use openFieldAnswers */
    comment: string | null;
    submittedAt: string;
    isInjected?: boolean;
    injectedId?: string;
  }>;
};

export function createEmptyScale(
  label = "",
  selection: FeedbackScaleSelection = "single",
): FeedbackScale {
  if (selection === "multi") {
    return {
      id: crypto.randomUUID(),
      label,
      selection: "multi",
      maxAnswers: 2,
      options: ["Вариант 1", "Вариант 2", "Вариант 3"],
    };
  }
  return {
    id: crypto.randomUUID(),
    label,
    selection: "single",
    options: ["1", "2", "3", "4", "5"],
  };
}

export function createEmptyOpenField(label = "", placeholder = ""): FeedbackOpenField {
  return {
    id: crypto.randomUUID(),
    label,
    placeholder,
  };
}

export function buildDefaultFeedbackForm(): Pick<
  FeedbackFormConfig,
  "title" | "scales" | "openFields" | "commentEnabled" | "commentPlaceholder"
> {
  const openFields = [createEmptyOpenField("Комментарий", "Что понравилось или что улучшить?")];
  return {
    title: "Обратная связь",
    scales: [
      createEmptyScale("Как вам мероприятие?"),
      createEmptyScale("Насколько полезен контент?"),
    ],
    openFields,
    commentEnabled: openFields.length > 0,
    commentPlaceholder: openFields[0]?.placeholder ?? "",
  };
}

export function hasOpenFieldAnswers(
  answers: Record<string, string> | undefined,
  comment: string | null | undefined,
): boolean {
  if (comment && comment.trim().length > 0) return true;
  return Object.values(answers ?? {}).some((value) => value.trim().length > 0);
}
