import { useCallback } from "react";
import { socket } from "../socket";
import type {
  CloudWordCount,
  PublicBanner,
  PublicViewMode,
  PublicViewSetPatch,
} from "../publicViewContract";
import type { ReactionWidget } from "../components/admin/AdminReactionsSection";
import type {
  RandomizerHistoryEntry,
  RandomizerListMode,
  RandomizerMode,
} from "../features/randomizer/randomizerLogic";

type QuestionViewState = {
  id?: string;
  showVoteCount?: boolean;
  showCorrectOption?: boolean;
  showQuestionTitle?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: CloudWordCount[];
  tagCountOverrides?: CloudWordCount[];
};

type UsePublicViewEmitterParams = {
  quizId: string;
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  questionRevealStage: "options" | "results";
  highlightedLeadersCount: number;
  questionForms: QuestionViewState[];
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  cloudCorrectTagColor: string;
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
  showEventTitleOnPlayer: boolean;
  playerBanners: PublicBanner[];
  speakerTileText: string;
  speakerTileBackgroundColor: string;
  speakerTileVisible: boolean;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileLinkUrl: string;
  programTileVisible: boolean;
  playerTilesOrder: string[];
  reactionsOverlayText: string;
  reactionsWidgets: ReactionWidget[];
  playerVisibleResultQuestionIds: string[];
  randomizerMode: RandomizerMode;
  randomizerListMode: RandomizerListMode;
  randomizerTitle: string;
  randomizerNamesText: string;
  randomizerMinNumber: number;
  randomizerMaxNumber: number;
  randomizerWinnersCount: number;
  randomizerExcludeWinners: boolean;
  randomizerSelectedWinners: string[];
  randomizerCurrentWinners: string[];
  randomizerHistory: RandomizerHistoryEntry[];
  randomizerRunId: number;
  reportTitle: string;
  reportModules: Array<
    | "event_header"
    | "participation_summary"
    | "quiz_results"
    | "vote_results"
    | "reactions_summary"
    | "randomizer_summary"
    | "speaker_questions_summary"
  >;
  reportVoteQuestionIds: string[];
  reportQuizQuestionIds: string[];
  reportQuizSubQuizIds: string[];
  reportSubQuizHideParticipantTableIds: string[];
  reportRandomizerRunIds: string[];
  reportReactionsWidgetIds: string[];
  reportSpeakerQuestionIds: string[];
  reportPublished: boolean;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandFontFamily: string;
  brandFontUrl: string;
  brandLogoUrl: string;
  brandPlayerBackgroundImageUrl: string;
  brandProjectorBackgroundImageUrl: string;
  brandBodyBackgroundColor: string;
};

export function usePublicViewEmitter(params: UsePublicViewEmitterParams) {
  const {
    quizId,
    publicViewMode,
    publicViewQuestionId,
    questionRevealStage,
    highlightedLeadersCount,
    questionForms,
    projectorBackground,
    cloudQuestionColor,
    cloudTagColors,
    cloudTopTagColor,
    cloudCorrectTagColor,
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
    showEventTitleOnPlayer,
    playerBanners,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileVisible,
    programTileText,
    programTileBackgroundColor,
    programTileLinkUrl,
    programTileVisible,
    playerTilesOrder,
    reactionsOverlayText,
    reactionsWidgets,
    playerVisibleResultQuestionIds,
    randomizerMode,
    randomizerListMode,
    randomizerTitle,
    randomizerNamesText,
    randomizerMinNumber,
    randomizerMaxNumber,
    randomizerWinnersCount,
    randomizerExcludeWinners,
    randomizerSelectedWinners,
    randomizerCurrentWinners,
    randomizerHistory,
    randomizerRunId,
    reportTitle,
    reportModules,
    reportVoteQuestionIds,
    reportQuizQuestionIds,
    reportQuizSubQuizIds,
    reportSubQuizHideParticipantTableIds,
    reportRandomizerRunIds,
    reportReactionsWidgetIds,
    reportSpeakerQuestionIds,
    reportPublished,
    brandPrimaryColor,
    brandAccentColor,
    brandSurfaceColor,
    brandTextColor,
    brandFontFamily,
    brandFontUrl,
    brandLogoUrl,
    brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor,
  } = params;

  const getQuestionViewState = useCallback(
    (questionId: string | undefined) => {
      const question = questionForms.find((q) => q.id === questionId);
      return {
        showVoteCount: question?.showVoteCount ?? false,
        showCorrectOption: question?.showCorrectOption ?? false,
        showQuestionTitle: question?.showQuestionTitle ?? true,
        hiddenTagTexts: question?.hiddenTagTexts ?? [],
        injectedTagWords: question?.injectedTagWords ?? [],
        tagCountOverrides: question?.tagCountOverrides ?? [],
      };
    },
    [questionForms],
  );

  const emitPublicViewSet = useCallback(
    (patch: PublicViewSetPatch = {}) => {
      if (!quizId) return;
      const nextMode = patch.mode ?? publicViewMode;
      const nextQuestionId =
        nextMode === "question" ? (patch.questionId ?? publicViewQuestionId) : undefined;
      const questionState = getQuestionViewState(nextQuestionId);
      const nextPayload = {
        quizId,
        mode: nextMode,
        questionId: nextQuestionId,
        questionRevealStage: patch.questionRevealStage ?? questionRevealStage,
        highlightedLeadersCount: patch.highlightedLeadersCount ?? highlightedLeadersCount,
        showVoteCount: patch.showVoteCount ?? questionState.showVoteCount,
        showCorrectOption: patch.showCorrectOption ?? questionState.showCorrectOption,
        showQuestionTitle: patch.showQuestionTitle ?? questionState.showQuestionTitle,
        hiddenTagTexts: patch.hiddenTagTexts ?? questionState.hiddenTagTexts,
        injectedTagWords: patch.injectedTagWords ?? questionState.injectedTagWords,
        tagCountOverrides: patch.tagCountOverrides ?? questionState.tagCountOverrides,
        projectorBackground: patch.projectorBackground ?? projectorBackground,
        cloudQuestionColor: patch.cloudQuestionColor ?? cloudQuestionColor,
        cloudTagColors: patch.cloudTagColors ?? cloudTagColors,
        cloudTopTagColor: patch.cloudTopTagColor ?? cloudTopTagColor,
        cloudCorrectTagColor: patch.cloudCorrectTagColor ?? cloudCorrectTagColor,
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
        showEventTitleOnPlayer: patch.showEventTitleOnPlayer ?? showEventTitleOnPlayer,
        playerBanners: patch.playerBanners ?? playerBanners,
        speakerTileText: patch.speakerTileText ?? speakerTileText,
        speakerTileBackgroundColor: patch.speakerTileBackgroundColor ?? speakerTileBackgroundColor,
        speakerTileVisible: patch.speakerTileVisible ?? speakerTileVisible,
        programTileText: patch.programTileText ?? programTileText,
        programTileBackgroundColor: patch.programTileBackgroundColor ?? programTileBackgroundColor,
        programTileLinkUrl: patch.programTileLinkUrl ?? programTileLinkUrl,
        programTileVisible: patch.programTileVisible ?? programTileVisible,
        playerTilesOrder: patch.playerTilesOrder ?? playerTilesOrder,
        reactionsOverlayText: patch.reactionsOverlayText ?? reactionsOverlayText,
        reactionsWidgets: patch.reactionsWidgets ?? reactionsWidgets,
        playerVisibleResultQuestionIds:
          patch.playerVisibleResultQuestionIds ?? playerVisibleResultQuestionIds,
        randomizerMode: patch.randomizerMode ?? randomizerMode,
        randomizerListMode: patch.randomizerListMode ?? randomizerListMode,
        randomizerTitle: patch.randomizerTitle ?? randomizerTitle,
        randomizerNamesText: patch.randomizerNamesText ?? randomizerNamesText,
        randomizerMinNumber: patch.randomizerMinNumber ?? randomizerMinNumber,
        randomizerMaxNumber: patch.randomizerMaxNumber ?? randomizerMaxNumber,
        randomizerWinnersCount: patch.randomizerWinnersCount ?? randomizerWinnersCount,
        randomizerExcludeWinners: patch.randomizerExcludeWinners ?? randomizerExcludeWinners,
        randomizerSelectedWinners: patch.randomizerSelectedWinners ?? randomizerSelectedWinners,
        randomizerCurrentWinners: patch.randomizerCurrentWinners ?? randomizerCurrentWinners,
        randomizerHistory: patch.randomizerHistory ?? randomizerHistory,
        randomizerRunId: patch.randomizerRunId ?? randomizerRunId,
        reportTitle: patch.reportTitle ?? reportTitle,
        reportModules: patch.reportModules ?? reportModules,
        reportVoteQuestionIds: patch.reportVoteQuestionIds ?? reportVoteQuestionIds,
        reportQuizQuestionIds: patch.reportQuizQuestionIds ?? reportQuizQuestionIds,
        reportQuizSubQuizIds: patch.reportQuizSubQuizIds ?? reportQuizSubQuizIds,
        reportSubQuizHideParticipantTableIds:
          patch.reportSubQuizHideParticipantTableIds ?? reportSubQuizHideParticipantTableIds,
        reportRandomizerRunIds: patch.reportRandomizerRunIds ?? reportRandomizerRunIds,
        reportReactionsWidgetIds: patch.reportReactionsWidgetIds ?? reportReactionsWidgetIds,
        reportSpeakerQuestionIds: patch.reportSpeakerQuestionIds ?? reportSpeakerQuestionIds,
        reportPublished: patch.reportPublished ?? reportPublished,
        brandPrimaryColor: patch.brandPrimaryColor ?? brandPrimaryColor,
        brandAccentColor: patch.brandAccentColor ?? brandAccentColor,
        brandSurfaceColor: patch.brandSurfaceColor ?? brandSurfaceColor,
        brandTextColor: patch.brandTextColor ?? brandTextColor,
        brandFontFamily: patch.brandFontFamily ?? brandFontFamily,
        brandFontUrl: patch.brandFontUrl ?? brandFontUrl,
        brandLogoUrl: patch.brandLogoUrl ?? brandLogoUrl,
        brandPlayerBackgroundImageUrl:
          patch.brandPlayerBackgroundImageUrl ?? brandPlayerBackgroundImageUrl,
        brandProjectorBackgroundImageUrl:
          patch.brandProjectorBackgroundImageUrl ?? brandProjectorBackgroundImageUrl,
        brandBodyBackgroundColor: patch.brandBodyBackgroundColor ?? brandBodyBackgroundColor,
      };
      socket.emit("admin:results:view:set", nextPayload);
    },
    [
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
      questionRevealStage,
      quizId,
      cloudTopTagColor,
      cloudCorrectTagColor,
      voteQuestionTextColor,
      voteOptionTextColor,
      voteProgressTrackColor,
      voteProgressBarColor,
      showFirstCorrectAnswerer,
      firstCorrectWinnersCount,
      showEventTitleOnPlayer,
      playerBanners,
      speakerTileText,
      speakerTileBackgroundColor,
      speakerTileVisible,
      programTileText,
      programTileBackgroundColor,
      programTileLinkUrl,
      programTileVisible,
      playerTilesOrder,
      reactionsOverlayText,
      reactionsWidgets,
      playerVisibleResultQuestionIds,
      randomizerMode,
      randomizerListMode,
      randomizerTitle,
      randomizerNamesText,
      randomizerMinNumber,
      randomizerMaxNumber,
      randomizerWinnersCount,
      randomizerExcludeWinners,
      randomizerSelectedWinners,
      randomizerCurrentWinners,
      randomizerHistory,
      randomizerRunId,
      reportTitle,
      reportModules,
      reportVoteQuestionIds,
      reportQuizQuestionIds,
      reportQuizSubQuizIds,
      reportSubQuizHideParticipantTableIds,
      reportRandomizerRunIds,
      reportReactionsWidgetIds,
      reportSpeakerQuestionIds,
      reportPublished,
      brandPrimaryColor,
      brandAccentColor,
      brandSurfaceColor,
      brandTextColor,
      brandFontFamily,
      brandFontUrl,
      brandLogoUrl,
      brandPlayerBackgroundImageUrl,
      brandProjectorBackgroundImageUrl,
      brandBodyBackgroundColor,
    ],
  );

  const emitBrandingPatch = useCallback(
    (patch: PublicViewSetPatch) => {
      emitPublicViewSet(patch);
    },
    [emitPublicViewSet],
  );

  return { emitPublicViewSet, emitBrandingPatch };
}
