import type { PublicViewPayload } from "../../publicViewContract";

type PatchableQuestion = {
  id?: string;
  showVoteCount?: boolean;
  showCorrectOption?: boolean;
  showQuestionTitle?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: Array<{ text: string; count: number }>;
  tagCountOverrides?: Array<{ text: string; count: number }>;
};

export function patchQuestionsFromPublicView<TQuestion extends PatchableQuestion>(
  questions: TQuestion[],
  publicView: PublicViewPayload,
): TQuestion[] {
  const questionId = typeof publicView.questionId === "string" ? publicView.questionId : undefined;
  if (!questionId) return questions;
  return questions.map((q) =>
    q.id === questionId
      ? {
          ...q,
          showVoteCount:
            (typeof publicView.showVoteCount === "boolean"
              ? publicView.showVoteCount
              : q.showVoteCount) ?? false,
          showCorrectOption:
            (typeof publicView.showCorrectOption === "boolean"
              ? publicView.showCorrectOption
              : q.showCorrectOption) ?? false,
          showQuestionTitle:
            (typeof publicView.showQuestionTitle === "boolean"
              ? publicView.showQuestionTitle
              : q.showQuestionTitle) ?? true,
          hiddenTagTexts: Array.isArray(publicView.hiddenTagTexts)
            ? (publicView.hiddenTagTexts as string[])
            : (q.hiddenTagTexts ?? []),
          injectedTagWords: Array.isArray(publicView.injectedTagWords)
            ? (publicView.injectedTagWords as Array<{ text: string; count: number }>)
            : (q.injectedTagWords ?? []),
          tagCountOverrides: Array.isArray(publicView.tagCountOverrides)
            ? (publicView.tagCountOverrides as Array<{ text: string; count: number }>)
            : (q.tagCountOverrides ?? []),
        }
      : q,
  );
}
