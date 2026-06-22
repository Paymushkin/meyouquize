import {
  sanitizeBrandThemeId,
  sanitizeExternalHttpUrl,
  type BrandThemeId,
} from "@meyouquize/shared";
import { useCallback } from "react";
import { socket } from "../socket";
import type {
  CloudWordCount,
  PublicBanner,
  PublicViewMode,
  PublicViewSetPatch,
} from "../publicViewContract";
import type { ReactionWidget } from "../components/admin/AdminReactionsSection";
import {
  randomizerNamesTextForPublicView,
  type RandomizerHistoryEntry,
  type RandomizerListMode,
  type RandomizerMode,
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

function playerBannersForEmit(banners: PublicBanner[]): PublicBanner[] {
  return banners
    .map((item) => ({
      ...item,
      linkUrl: sanitizeExternalHttpUrl(item.linkUrl),
    }))
    .filter((item) => item.id && item.linkUrl && item.backgroundUrl);
}

/** Явное значение из patch, в т.ч. `""` для сброса (в отличие от `??`). */
function patchStringField(
  patch: PublicViewSetPatch,
  key: keyof PublicViewSetPatch,
  current: string,
): string {
  if (!Object.prototype.hasOwnProperty.call(patch, key)) return current;
  const value = patch[key];
  return typeof value === "string" ? value : current;
}

type UsePublicViewEmitterParams = {
  quizId: string;
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  questionRevealStage: "options" | "results";
  highlightedLeadersCount: number;
  /** Сабквиз для режима leaderboard на проекторе (из вкладки «Результаты»). */
  resultsLeaderboardSubQuizId: string;
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
  voteOptionBorderColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  showFirstCorrectAnswerer: boolean;
  firstCorrectWinnersCount: number;
  showEventTitleOnPlayer: boolean;
  playerBanners: PublicBanner[];
  speakerTileText: string;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  speakerTileVisible: boolean;
  speakerQuestionsEnabled: boolean;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
  programTileLinkUrl: string;
  programTileVisible: boolean;
  playerQuizResultsTileVisible: boolean;
  playerQuizResultsTileText: string;
  playerQuizResultsTileBackgroundColor: string;
  playerQuizResultsTileTextColor: string;
  playerQuizResultsSubQuizId: string;
  playerQuizResultsSubQuizIds: string[];
  playerTilesOrder: string[];
  reactionsOverlayText: string;
  reactionsWidgets: ReactionWidget[];
  playerVisibleResultQuestionIds: string[];
  playerVoteOptionTextColor: string;
  playerVoteProgressTrackColor: string;
  playerVoteProgressBarColor: string;
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
  randomizerAnimationPool: string[];
  randomizerHistory: RandomizerHistoryEntry[];
  randomizerRunId: number;
  reportTitle: string;
  reportModules: Array<
    | "event_header"
    | "participation_summary"
    | "quiz_results"
    | "vote_results"
    | "reactions_summary"
    | "feedback_summary"
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
  reportFeedbackFormIds: string[];
  reportPublished: boolean;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandInputTextColor: string;
  brandFontFamily: string;
  brandFontUrl: string;
  brandLogoUrl: string;
  brandPlayerBackgroundImageUrl: string;
  brandProjectorBackgroundImageUrl: string;
  brandBodyBackgroundColor: string;
  brandTheme: BrandThemeId;
  projectorJoinQrVisible: boolean;
  projectorJoinQrText: string;
  projectorJoinQrTextColor: string;
  projectorJoinQrOverlaySizePx: number;
  projectorJoinQrOverlayInsetPx: number;
  projectorJoinQrOverlayCorner: import("@meyouquize/shared").ProjectorJoinQrOverlayCorner;
};

export function usePublicViewEmitter(params: UsePublicViewEmitterParams) {
  const {
    quizId,
    publicViewMode,
    publicViewQuestionId,
    questionRevealStage,
    highlightedLeadersCount,
    resultsLeaderboardSubQuizId,
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
    voteOptionBorderColor,
    voteProgressTrackColor,
    voteProgressBarColor,
    showFirstCorrectAnswerer,
    firstCorrectWinnersCount,
    showEventTitleOnPlayer,
    playerBanners,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileTextColor,
    speakerTileVisible,
    speakerQuestionsEnabled,
    programTileText,
    programTileBackgroundColor,
    programTileTextColor,
    programTileLinkUrl,
    programTileVisible,
    playerQuizResultsTileVisible,
    playerQuizResultsTileText,
    playerQuizResultsTileBackgroundColor,
    playerQuizResultsTileTextColor,
    playerQuizResultsSubQuizId,
    playerQuizResultsSubQuizIds,
    playerTilesOrder,
    reactionsOverlayText,
    reactionsWidgets,
    playerVisibleResultQuestionIds,
    playerVoteOptionTextColor,
    playerVoteProgressTrackColor,
    playerVoteProgressBarColor,
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
    randomizerAnimationPool,
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
    reportFeedbackFormIds,
    reportPublished,
    brandPrimaryColor,
    brandAccentColor,
    brandSurfaceColor,
    brandTextColor,
    brandInputTextColor,
    brandFontFamily,
    brandFontUrl,
    brandLogoUrl,
    brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor,
    brandTheme,
    projectorJoinQrVisible,
    projectorJoinQrText,
    projectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
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
      const leaderboardSubQuizIdRaw =
        patch.leaderboardSubQuizId !== undefined
          ? patch.leaderboardSubQuizId
          : nextMode === "leaderboard"
            ? resultsLeaderboardSubQuizId
            : undefined;
      const leaderboardSubQuizIdForEmit =
        leaderboardSubQuizIdRaw !== undefined ? String(leaderboardSubQuizIdRaw).trim() : "";
      const nextPayload = {
        quizId,
        mode: nextMode,
        questionId: nextQuestionId,
        questionRevealStage: patch.questionRevealStage ?? questionRevealStage,
        highlightedLeadersCount: patch.highlightedLeadersCount ?? highlightedLeadersCount,
        ...(nextMode === "leaderboard" && leaderboardSubQuizIdForEmit
          ? { leaderboardSubQuizId: leaderboardSubQuizIdForEmit }
          : patch.leaderboardSubQuizId !== undefined
            ? { leaderboardSubQuizId: leaderboardSubQuizIdForEmit }
            : {}),
        showVoteCount: patch.showVoteCount ?? questionState.showVoteCount,
        showCorrectOption: patch.showCorrectOption ?? questionState.showCorrectOption,
        showQuestionTitle: patch.showQuestionTitle ?? questionState.showQuestionTitle,
        hiddenTagTexts: patch.hiddenTagTexts ?? questionState.hiddenTagTexts,
        injectedTagWords: patch.injectedTagWords ?? questionState.injectedTagWords,
        tagCountOverrides: patch.tagCountOverrides ?? questionState.tagCountOverrides,
        ...(patch.tagCloudManualByQuestionId !== undefined
          ? { tagCloudManualByQuestionId: patch.tagCloudManualByQuestionId }
          : {}),
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
        voteOptionBorderColor: patch.voteOptionBorderColor ?? voteOptionBorderColor,
        voteProgressTrackColor: patch.voteProgressTrackColor ?? voteProgressTrackColor,
        voteProgressBarColor: patch.voteProgressBarColor ?? voteProgressBarColor,
        showFirstCorrectAnswerer: patch.showFirstCorrectAnswerer ?? showFirstCorrectAnswerer,
        firstCorrectWinnersCount: patch.firstCorrectWinnersCount ?? firstCorrectWinnersCount,
        showEventTitleOnPlayer: patch.showEventTitleOnPlayer ?? showEventTitleOnPlayer,
        playerBanners: playerBannersForEmit(patch.playerBanners ?? playerBanners),
        speakerTileText: patch.speakerTileText ?? speakerTileText,
        speakerTileBackgroundColor: patch.speakerTileBackgroundColor ?? speakerTileBackgroundColor,
        speakerTileTextColor: patch.speakerTileTextColor ?? speakerTileTextColor,
        speakerTileVisible: patch.speakerTileVisible ?? speakerTileVisible,
        speakerQuestionsEnabled: patch.speakerQuestionsEnabled ?? speakerQuestionsEnabled,
        programTileText: patch.programTileText ?? programTileText,
        programTileBackgroundColor: patch.programTileBackgroundColor ?? programTileBackgroundColor,
        programTileTextColor: patch.programTileTextColor ?? programTileTextColor,
        programTileLinkUrl: sanitizeExternalHttpUrl(patch.programTileLinkUrl ?? programTileLinkUrl),
        programTileVisible: patch.programTileVisible ?? programTileVisible,
        playerQuizResultsTileVisible:
          patch.playerQuizResultsTileVisible ?? playerQuizResultsTileVisible,
        playerQuizResultsTileText: patch.playerQuizResultsTileText ?? playerQuizResultsTileText,
        playerQuizResultsTileBackgroundColor:
          patch.playerQuizResultsTileBackgroundColor ?? playerQuizResultsTileBackgroundColor,
        playerQuizResultsTileTextColor:
          patch.playerQuizResultsTileTextColor ?? playerQuizResultsTileTextColor,
        playerQuizResultsSubQuizId: patch.playerQuizResultsSubQuizId ?? playerQuizResultsSubQuizId,
        playerQuizResultsSubQuizIds:
          patch.playerQuizResultsSubQuizIds ?? playerQuizResultsSubQuizIds,
        playerTilesOrder: patch.playerTilesOrder ?? playerTilesOrder,
        reactionsOverlayText: patch.reactionsOverlayText ?? reactionsOverlayText,
        reactionsWidgets: patch.reactionsWidgets ?? reactionsWidgets,
        playerVisibleResultQuestionIds:
          patch.playerVisibleResultQuestionIds ?? playerVisibleResultQuestionIds,
        playerVoteOptionTextColor: patch.playerVoteOptionTextColor ?? playerVoteOptionTextColor,
        playerVoteProgressTrackColor:
          patch.playerVoteProgressTrackColor ?? playerVoteProgressTrackColor,
        playerVoteProgressBarColor: patch.playerVoteProgressBarColor ?? playerVoteProgressBarColor,
        randomizerMode: patch.randomizerMode ?? randomizerMode,
        randomizerListMode: patch.randomizerListMode ?? randomizerListMode,
        randomizerTitle: patch.randomizerTitle ?? randomizerTitle,
        randomizerNamesText: randomizerNamesTextForPublicView(
          patch.randomizerListMode ?? randomizerListMode,
          patch.randomizerNamesText ?? randomizerNamesText,
        ),
        randomizerMinNumber: patch.randomizerMinNumber ?? randomizerMinNumber,
        randomizerMaxNumber: patch.randomizerMaxNumber ?? randomizerMaxNumber,
        randomizerWinnersCount: patch.randomizerWinnersCount ?? randomizerWinnersCount,
        randomizerExcludeWinners: patch.randomizerExcludeWinners ?? randomizerExcludeWinners,
        randomizerSelectedWinners: patch.randomizerSelectedWinners ?? randomizerSelectedWinners,
        randomizerCurrentWinners: patch.randomizerCurrentWinners ?? randomizerCurrentWinners,
        randomizerAnimationPool: patch.randomizerAnimationPool ?? randomizerAnimationPool,
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
        reportFeedbackFormIds: patch.reportFeedbackFormIds ?? reportFeedbackFormIds,
        reportPublished: patch.reportPublished ?? reportPublished,
        brandPrimaryColor: patch.brandPrimaryColor ?? brandPrimaryColor,
        brandAccentColor: patch.brandAccentColor ?? brandAccentColor,
        brandSurfaceColor: patch.brandSurfaceColor ?? brandSurfaceColor,
        brandTextColor: patch.brandTextColor ?? brandTextColor,
        brandInputTextColor: patch.brandInputTextColor ?? brandInputTextColor,
        brandFontFamily: patchStringField(patch, "brandFontFamily", brandFontFamily),
        brandFontUrl: patchStringField(patch, "brandFontUrl", brandFontUrl),
        brandLogoUrl: patchStringField(patch, "brandLogoUrl", brandLogoUrl),
        brandPlayerBackgroundImageUrl: patchStringField(
          patch,
          "brandPlayerBackgroundImageUrl",
          brandPlayerBackgroundImageUrl,
        ),
        brandProjectorBackgroundImageUrl: patchStringField(
          patch,
          "brandProjectorBackgroundImageUrl",
          brandProjectorBackgroundImageUrl,
        ),
        brandBodyBackgroundColor: patchStringField(
          patch,
          "brandBodyBackgroundColor",
          brandBodyBackgroundColor,
        ),
        brandTheme:
          patch.brandTheme !== undefined ? sanitizeBrandThemeId(patch.brandTheme) : brandTheme,
        projectorJoinQrVisible: patch.projectorJoinQrVisible ?? projectorJoinQrVisible,
        projectorJoinQrText: patch.projectorJoinQrText ?? projectorJoinQrText,
        projectorJoinQrTextColor: patch.projectorJoinQrTextColor ?? projectorJoinQrTextColor,
        projectorJoinQrOverlaySizePx:
          patch.projectorJoinQrOverlaySizePx ?? projectorJoinQrOverlaySizePx,
        projectorJoinQrOverlayInsetPx:
          patch.projectorJoinQrOverlayInsetPx ?? projectorJoinQrOverlayInsetPx,
        projectorJoinQrOverlayCorner:
          patch.projectorJoinQrOverlayCorner ?? projectorJoinQrOverlayCorner,
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
      resultsLeaderboardSubQuizId,
      projectorBackground,
      publicViewMode,
      publicViewQuestionId,
      questionRevealStage,
      quizId,
      cloudTopTagColor,
      cloudCorrectTagColor,
      voteQuestionTextColor,
      voteOptionTextColor,
      voteOptionBorderColor,
      voteProgressTrackColor,
      voteProgressBarColor,
      showFirstCorrectAnswerer,
      firstCorrectWinnersCount,
      showEventTitleOnPlayer,
      playerBanners,
      speakerTileText,
      speakerTileBackgroundColor,
      speakerTileTextColor,
      speakerTileVisible,
      speakerQuestionsEnabled,
      programTileText,
      programTileBackgroundColor,
      programTileTextColor,
      programTileLinkUrl,
      programTileVisible,
      playerQuizResultsTileVisible,
      playerQuizResultsTileText,
      playerQuizResultsTileBackgroundColor,
      playerQuizResultsTileTextColor,
      playerQuizResultsSubQuizId,
      playerTilesOrder,
      reactionsOverlayText,
      reactionsWidgets,
      playerVisibleResultQuestionIds,
      playerVoteOptionTextColor,
      playerVoteProgressTrackColor,
      playerVoteProgressBarColor,
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
      randomizerAnimationPool,
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
      reportFeedbackFormIds,
      reportPublished,
      brandPrimaryColor,
      brandAccentColor,
      brandSurfaceColor,
      brandTextColor,
      brandInputTextColor,
      brandFontFamily,
      brandFontUrl,
      brandLogoUrl,
      brandPlayerBackgroundImageUrl,
      brandProjectorBackgroundImageUrl,
      brandBodyBackgroundColor,
      brandTheme,
      projectorJoinQrVisible,
      projectorJoinQrText,
      projectorJoinQrTextColor,
      projectorJoinQrOverlaySizePx,
      projectorJoinQrOverlayInsetPx,
      projectorJoinQrOverlayCorner,
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
