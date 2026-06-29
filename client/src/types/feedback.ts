export const FEEDBACK_SCALE_MIN_OPTIONS = 2;
export const FEEDBACK_SCALE_MAX_OPTIONS = 10;
export const FEEDBACK_OPEN_FIELD_MAX = 10;

export type FeedbackScale = {
  id: string;
  label: string;
  options: string[];
};

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

export type FeedbackResultsPayload = {
  form: FeedbackFormConfig;
  responseCount: number;
  scaleStats: FeedbackScaleStat[];
  responses: Array<{
    nickname: string;
    scaleAnswers: Record<string, number>;
    openFieldAnswers: Record<string, string>;
    /** @deprecated use openFieldAnswers */
    comment: string | null;
    submittedAt: string;
  }>;
};

export function createEmptyScale(label = ""): FeedbackScale {
  return {
    id: crypto.randomUUID(),
    label,
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
