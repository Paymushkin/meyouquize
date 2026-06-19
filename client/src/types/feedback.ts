export type FeedbackScale = {
  id: string;
  label: string;
  options: [string, string, string, string, string];
};

export type FeedbackFormConfig = {
  id: string;
  quizId: string;
  title: string;
  isActive: boolean;
  isClosed: boolean;
  scales: FeedbackScale[];
  commentEnabled: boolean;
  commentPlaceholder: string;
};

export type ActiveFeedbackForm = {
  id: string;
  title: string;
  scales: FeedbackScale[];
  commentEnabled: boolean;
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

export function buildDefaultFeedbackForm(): Pick<
  FeedbackFormConfig,
  "title" | "scales" | "commentEnabled" | "commentPlaceholder"
> {
  return {
    title: "Обратная связь",
    scales: [
      createEmptyScale("Как вам мероприятие?"),
      createEmptyScale("Насколько полезен контент?"),
    ],
    commentEnabled: true,
    commentPlaceholder: "Что понравилось или что улучшить?",
  };
}
