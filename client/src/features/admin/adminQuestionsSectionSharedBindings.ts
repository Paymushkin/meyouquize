import type { ComponentProps } from "react";
import type { AdminQuestionsSection } from "../../components/admin/AdminQuestionsSection";
import type { QuestionResult } from "../../admin/adminEventTypes";
import type { PublicViewMode } from "../../publicViewContract";

export type AdminQuestionsSectionSharedBindings = Pick<
  ComponentProps<typeof AdminQuestionsSection>,
  | "eventName"
  | "expandedQuestionSettingsIndex"
  | "setExpandedQuestionSettingsIndex"
  | "questionResults"
  | "publicViewMode"
  | "publicViewQuestionId"
  | "setMessage"
  | "openQuestionDialog"
  | "setPublicResultsView"
  | "updateQuestionShowVoteCount"
  | "updateQuestionShowCorrectOption"
  | "openTagInputDialog"
  | "openTagResultsDialog"
  | "updateOptionVoteCountOverride"
  | "clearOptionVoteCountOverride"
  | "resetOptionVoteCountOverrides"
  | "confirmResetQuestionAnswersByIndex"
  | "toggleQuestion"
  | "updateQuestionProjectorShowFirstCorrect"
  | "patchQuestionProjectorFirstCorrectWinnersCount"
  | "commitQuestionProjectorFirstCorrectWinnersCount"
  | "updateQuestionRankingProjectorMetric"
  | "showFirstCorrectAnswerer"
  | "updateShowFirstCorrectAnswerer"
  | "questionRevealStage"
  | "setQuestionRevealStageForQuestion"
  | "playerVisibleResultQuestionIds"
  | "togglePlayerVisibleResultQuestionId"
>;

type Source = {
  eventName: string;
  expandedQuestionSettingsIndex: number | null;
  setExpandedQuestionSettingsIndex: AdminQuestionsSectionSharedBindings["setExpandedQuestionSettingsIndex"];
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId: string | undefined;
  setMessage: (value: string) => void;
  openQuestionDialog: (globalIndex: number) => void;
  setPublicResultsView: AdminQuestionsSectionSharedBindings["setPublicResultsView"];
  updateQuestionShowVoteCount: AdminQuestionsSectionSharedBindings["updateQuestionShowVoteCount"];
  updateQuestionShowCorrectOption: AdminQuestionsSectionSharedBindings["updateQuestionShowCorrectOption"];
  openTagInputDialog: (globalIndex: number) => void;
  openTagResultsDialog: (globalIndex: number) => void;
  updateOptionVoteCountOverride: AdminQuestionsSectionSharedBindings["updateOptionVoteCountOverride"];
  clearOptionVoteCountOverride: AdminQuestionsSectionSharedBindings["clearOptionVoteCountOverride"];
  resetOptionVoteCountOverrides: AdminQuestionsSectionSharedBindings["resetOptionVoteCountOverrides"];
  confirmResetQuestionAnswersByIndex: (globalIndex: number) => void;
  toggleQuestion: (globalIndex: number, enabled: boolean) => void;
  updateQuestionProjectorShowFirstCorrect: AdminQuestionsSectionSharedBindings["updateQuestionProjectorShowFirstCorrect"];
  patchQuestionProjectorFirstCorrectWinnersCount: AdminQuestionsSectionSharedBindings["patchQuestionProjectorFirstCorrectWinnersCount"];
  commitQuestionProjectorFirstCorrectWinnersCount: AdminQuestionsSectionSharedBindings["commitQuestionProjectorFirstCorrectWinnersCount"];
  updateQuestionRankingProjectorMetric: AdminQuestionsSectionSharedBindings["updateQuestionRankingProjectorMetric"];
  showFirstCorrectAnswerer: boolean;
  updateShowFirstCorrectAnswerer: AdminQuestionsSectionSharedBindings["updateShowFirstCorrectAnswerer"];
  questionRevealStage: "options" | "results";
  setQuestionRevealStageForQuestion: AdminQuestionsSectionSharedBindings["setQuestionRevealStageForQuestion"];
  playerVisibleResultQuestionIds: string[];
  togglePlayerVisibleResultQuestionId: (questionId: string) => void;
};

export function buildAdminQuestionsSectionSharedBindings(
  source: Source,
): AdminQuestionsSectionSharedBindings {
  return {
    eventName: source.eventName,
    expandedQuestionSettingsIndex: source.expandedQuestionSettingsIndex,
    setExpandedQuestionSettingsIndex: source.setExpandedQuestionSettingsIndex,
    questionResults: source.questionResults,
    publicViewMode: source.publicViewMode,
    publicViewQuestionId: source.publicViewQuestionId,
    setMessage: source.setMessage,
    openQuestionDialog: source.openQuestionDialog,
    setPublicResultsView: source.setPublicResultsView,
    updateQuestionShowVoteCount: source.updateQuestionShowVoteCount,
    updateQuestionShowCorrectOption: source.updateQuestionShowCorrectOption,
    openTagInputDialog: source.openTagInputDialog,
    openTagResultsDialog: source.openTagResultsDialog,
    updateOptionVoteCountOverride: source.updateOptionVoteCountOverride,
    clearOptionVoteCountOverride: source.clearOptionVoteCountOverride,
    resetOptionVoteCountOverrides: source.resetOptionVoteCountOverrides,
    confirmResetQuestionAnswersByIndex: source.confirmResetQuestionAnswersByIndex,
    toggleQuestion: source.toggleQuestion,
    updateQuestionProjectorShowFirstCorrect: source.updateQuestionProjectorShowFirstCorrect,
    patchQuestionProjectorFirstCorrectWinnersCount:
      source.patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount:
      source.commitQuestionProjectorFirstCorrectWinnersCount,
    updateQuestionRankingProjectorMetric: source.updateQuestionRankingProjectorMetric,
    showFirstCorrectAnswerer: source.showFirstCorrectAnswerer,
    updateShowFirstCorrectAnswerer: source.updateShowFirstCorrectAnswerer,
    questionRevealStage: source.questionRevealStage,
    setQuestionRevealStageForQuestion: source.setQuestionRevealStageForQuestion,
    playerVisibleResultQuestionIds: source.playerVisibleResultQuestionIds,
    togglePlayerVisibleResultQuestionId: source.togglePlayerVisibleResultQuestionId,
  };
}
