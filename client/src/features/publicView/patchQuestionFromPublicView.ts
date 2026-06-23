import { resolveTagCloudManualForQuestion } from "@meyouquize/shared";
import type { PublicViewPayload } from "../../publicViewContract";
import { readCloudManualFromPublicView } from "../tagCloudAdmin";

type PatchableQuestion = {
  id?: string;
  showVoteCount?: boolean;
  showCorrectOption?: boolean;
  showQuestionTitle?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: Array<{ text: string; count: number }>;
  tagCountOverrides?: Array<{ text: string; count: number }>;
  optionVoteCountOverrides?: Array<{ text: string; count: number }>;
};

export function patchQuestionsFromPublicView<TQuestion extends PatchableQuestion>(
  questions: TQuestion[],
  publicView: PublicViewPayload,
): TQuestion[] {
  const questionId = typeof publicView.questionId === "string" ? publicView.questionId : undefined;
  if (!questionId) return questions;
  const manual = readCloudManualFromPublicView(publicView);
  const resolved = resolveTagCloudManualForQuestion(manual, questionId);
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
          hiddenTagTexts: resolved.hiddenTagTexts,
          injectedTagWords: resolved.injectedTagWords,
          tagCountOverrides: resolved.tagCountOverrides,
          optionVoteCountOverrides: resolved.optionVoteCountOverrides,
        }
      : q,
  );
}
