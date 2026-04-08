import { useCallback } from "react";
import { socket } from "../socket";
import type { CloudWordCount, PublicViewMode, PublicViewSetPatch } from "../publicViewContract";

type QuestionViewState = {
  id?: string;
  showVoteCount?: boolean;
  showQuestionTitle?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: CloudWordCount[];
  tagCountOverrides?: CloudWordCount[];
};

type UsePublicViewEmitterParams = {
  quizId: string;
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  highlightedLeadersCount: number;
  questionForms: QuestionViewState[];
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  cloudDensity: number;
  cloudTagPadding: number;
  cloudSpiral: "archimedean" | "rectangular";
  cloudAnimationStrength: number;
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  showFirstCorrectAnswerer: boolean;
  firstCorrectWinnersCount: number;
};

export function usePublicViewEmitter(params: UsePublicViewEmitterParams) {
  const {
    quizId,
    publicViewMode,
    publicViewQuestionId,
    highlightedLeadersCount,
    questionForms,
    projectorBackground,
    cloudQuestionColor,
    cloudTagColors,
    cloudTopTagColor,
    cloudDensity,
    cloudTagPadding,
    cloudSpiral,
    cloudAnimationStrength,
    voteQuestionTextColor,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
    showFirstCorrectAnswerer,
    firstCorrectWinnersCount,
  } = params;

  const getQuestionViewState = useCallback((questionId: string | undefined) => {
    const question = questionForms.find((q) => q.id === questionId);
    return {
      showVoteCount: question?.showVoteCount ?? true,
      showQuestionTitle: question?.showQuestionTitle ?? true,
      hiddenTagTexts: question?.hiddenTagTexts ?? [],
      injectedTagWords: question?.injectedTagWords ?? [],
      tagCountOverrides: question?.tagCountOverrides ?? [],
    };
  }, [questionForms]);

  const emitPublicViewSet = useCallback((patch: PublicViewSetPatch = {}) => {
    if (!quizId) return;
    const nextMode = patch.mode ?? publicViewMode;
    const nextQuestionId = nextMode === "question"
      ? (patch.questionId ?? publicViewQuestionId)
      : undefined;
    const questionState = getQuestionViewState(nextQuestionId);
    socket.emit("admin:results:view:set", {
      quizId,
      mode: nextMode,
      questionId: nextQuestionId,
      highlightedLeadersCount: patch.highlightedLeadersCount ?? highlightedLeadersCount,
      showVoteCount: patch.showVoteCount ?? questionState.showVoteCount,
      showQuestionTitle: patch.showQuestionTitle ?? questionState.showQuestionTitle,
      hiddenTagTexts: patch.hiddenTagTexts ?? questionState.hiddenTagTexts,
      injectedTagWords: patch.injectedTagWords ?? questionState.injectedTagWords,
      tagCountOverrides: patch.tagCountOverrides ?? questionState.tagCountOverrides,
      projectorBackground: patch.projectorBackground ?? projectorBackground,
      cloudQuestionColor: patch.cloudQuestionColor ?? cloudQuestionColor,
      cloudTagColors: patch.cloudTagColors ?? cloudTagColors,
      cloudTopTagColor: patch.cloudTopTagColor ?? cloudTopTagColor,
      cloudDensity: patch.cloudDensity ?? cloudDensity,
      cloudTagPadding: patch.cloudTagPadding ?? cloudTagPadding,
      cloudSpiral: patch.cloudSpiral ?? cloudSpiral,
      cloudAnimationStrength: patch.cloudAnimationStrength ?? cloudAnimationStrength,
      voteQuestionTextColor: patch.voteQuestionTextColor ?? voteQuestionTextColor,
      voteOptionTextColor: patch.voteOptionTextColor ?? voteOptionTextColor,
      voteProgressTrackColor: patch.voteProgressTrackColor ?? voteProgressTrackColor,
      voteProgressBarColor: patch.voteProgressBarColor ?? voteProgressBarColor,
      showFirstCorrectAnswerer: patch.showFirstCorrectAnswerer ?? showFirstCorrectAnswerer,
      firstCorrectWinnersCount: patch.firstCorrectWinnersCount ?? firstCorrectWinnersCount,
    });
  }, [
    cloudAnimationStrength,
    cloudDensity,
    cloudQuestionColor,
    cloudSpiral,
    cloudTagColors,
    cloudTagPadding,
    getQuestionViewState,
    highlightedLeadersCount,
    projectorBackground,
    publicViewMode,
    publicViewQuestionId,
    quizId,
    cloudTopTagColor,
    voteQuestionTextColor,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
    showFirstCorrectAnswerer,
    firstCorrectWinnersCount,
  ]);

  const emitBrandingPatch = useCallback((patch: PublicViewSetPatch) => {
    emitPublicViewSet(patch);
  }, [emitPublicViewSet]);

  return { emitPublicViewSet, emitBrandingPatch };
}
