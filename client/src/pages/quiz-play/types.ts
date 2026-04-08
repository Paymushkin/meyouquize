export type ActiveQuestion = {
  id: string;
  text: string;
  type: "single" | "multi" | "tag_cloud";
  maxAnswers?: number;
  options: Array<{ id: string; text: string }>;
  isClosed: boolean;
};

export type QuizState = {
  id: string;
  title: string;
  status: string;
  quizProgress: { subQuizId: string; index: number; total: number } | null;
  activeQuestion: ActiveQuestion | null;
};
