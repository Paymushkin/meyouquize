import {
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  PROJECTOR_JOIN_QR_OVERLAY_CORNERS,
  normalizePublicViewState,
  resolveBannerUniqueClicks,
  sanitizeBrandThemeId,
  QUIZ_RESULTS_TILE_ID,
  SPEAKER_TILE_ID,
  withQuizResultsTileLast,
  isQuizResultsTileId,
  parseQuizResultsSubQuizIdFromTileId,
  quizResultsTileIdForSubQuiz,
  prunePlayerUiRefsForRoom,
  type CloudWordCount,
  type PublicBanner,
  type PublicBannerClickStats,
  type PublicReactionWidgetStats,
  type ReportModuleId,
  type PublicViewMode,
  type ProjectorJoinQrOverlayCorner,
  type PublicViewPatch as SharedPublicViewPatch,
  type BrandThemeId,
  type PublicViewPayload as SharedPublicViewPayload,
} from "@meyouquize/shared";

type BrandingKeys =
  | "projectorBackground"
  | "cloudQuestionColor"
  | "cloudTagColors"
  | "cloudTopTagColor"
  | "cloudCorrectTagColor"
  | "cloudDensity"
  | "cloudTagPadding"
  | "cloudSpiral"
  | "cloudAnimationStrength"
  | "voteQuestionTextColor"
  | "voteOptionTextColor"
  | "voteOptionBorderColor"
  | "voteProgressTrackColor"
  | "voteProgressBarColor"
  | "brandPrimaryColor"
  | "brandAccentColor"
  | "brandSurfaceColor"
  | "brandTextColor"
  | "brandInputTextColor"
  | "brandFontFamily"
  | "brandFontUrl"
  | "brandLogoUrl"
  | "brandPlayerBackgroundImageUrl"
  | "brandProjectorBackgroundImageUrl"
  | "brandBodyBackgroundColor"
  | "projectorJoinQrVisible"
  | "projectorJoinQrOverlayVisible"
  | "projectorJoinQrText"
  | "projectorJoinQrTextColor"
  | "projectorJoinQrOverlaySizePx"
  | "projectorJoinQrOverlayInsetVerticalPx"
  | "projectorJoinQrOverlayInsetHorizontalPx"
  | "projectorJoinQrOverlayInsetPx"
  | "projectorJoinQrOverlayCorner";
type PlayerUiResultKeys =
  | "playerVoteOptionTextColor"
  | "playerVoteProgressTrackColor"
  | "playerVoteProgressBarColor";

export type BrandingState = Pick<SharedPublicViewPayload, BrandingKeys | PlayerUiResultKeys> & {
  brandTheme: BrandThemeId;
};

export type CloudManualStateByQuestion = Record<
  string,
  {
    hiddenTagTexts: string[];
    injectedTagWords: CloudWordCount[];
    tagCountOverrides: CloudWordCount[];
    optionVoteCountOverrides: CloudWordCount[];
  }
>;

type PublicReactionWidget = {
  id: string;
  title: string;
  reactions: string[];
};

export const PROGRAM_TILE_ID = "program_tile";
export { PHOTO_WALL_TILE_ID } from "@meyouquize/shared";

export type PublicViewPayload = SharedPublicViewPayload & {
  reactionsWidgets?: PublicReactionWidget[];
  playerVisibleResultQuestionIds?: string[];
  randomizerListMode?: "participants_only" | "free_list";
  speakerTileVisible?: boolean;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
};

export type PublicViewSetPatch = SharedPublicViewPatch & {
  reactionsWidgets?: PublicReactionWidget[];
  playerVisibleResultQuestionIds?: string[];
  randomizerListMode?: "participants_only" | "free_list";
  speakerTileVisible?: boolean;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
};

export type {
  CloudWordCount,
  PublicBanner,
  PublicBannerClickStats,
  PublicReactionWidgetStats,
  PublicViewMode,
  ProjectorJoinQrOverlayCorner,
  ReportModuleId,
};
export {
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  PROJECTOR_JOIN_QR_OVERLAY_CORNERS,
  normalizePublicViewState,
  resolveBannerUniqueClicks,
  QUIZ_RESULTS_TILE_ID,
  SPEAKER_TILE_ID,
  withQuizResultsTileLast,
  isQuizResultsTileId,
  parseQuizResultsSubQuizIdFromTileId,
  quizResultsTileIdForSubQuiz,
  prunePlayerUiRefsForRoom,
};

export function toBrandingState(payload: Partial<PublicViewPayload>): BrandingState {
  const view = normalizePublicViewState(payload);
  return {
    projectorBackground: view.projectorBackground,
    cloudQuestionColor: view.cloudQuestionColor,
    cloudTagColors: view.cloudTagColors,
    cloudTopTagColor: view.cloudTopTagColor,
    cloudCorrectTagColor: view.cloudCorrectTagColor,
    cloudDensity: view.cloudDensity,
    cloudTagPadding: view.cloudTagPadding,
    cloudSpiral: view.cloudSpiral,
    cloudAnimationStrength: view.cloudAnimationStrength,
    voteQuestionTextColor: view.voteQuestionTextColor,
    voteOptionTextColor: view.voteOptionTextColor,
    voteOptionBorderColor: view.voteOptionBorderColor,
    voteProgressTrackColor: view.voteProgressTrackColor,
    voteProgressBarColor: view.voteProgressBarColor,
    brandPrimaryColor: view.brandPrimaryColor,
    brandAccentColor: view.brandAccentColor,
    brandSurfaceColor: view.brandSurfaceColor,
    brandTextColor: view.brandTextColor,
    brandInputTextColor: view.brandInputTextColor,
    brandFontFamily: view.brandFontFamily,
    brandFontUrl: view.brandFontUrl,
    brandLogoUrl: view.brandLogoUrl,
    brandPlayerBackgroundImageUrl: view.brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: view.brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor: view.brandBodyBackgroundColor,
    brandTheme: sanitizeBrandThemeId(view.brandTheme),
    projectorJoinQrVisible: view.projectorJoinQrVisible,
    projectorJoinQrOverlayVisible: view.projectorJoinQrOverlayVisible,
    projectorJoinQrText: view.projectorJoinQrText,
    projectorJoinQrTextColor: view.projectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx: view.projectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetVerticalPx: view.projectorJoinQrOverlayInsetVerticalPx,
    projectorJoinQrOverlayInsetHorizontalPx: view.projectorJoinQrOverlayInsetHorizontalPx,
    projectorJoinQrOverlayInsetPx: view.projectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner: view.projectorJoinQrOverlayCorner,
    playerVoteOptionTextColor: view.playerVoteOptionTextColor,
    playerVoteProgressTrackColor: view.playerVoteProgressTrackColor,
    playerVoteProgressBarColor: view.playerVoteProgressBarColor,
  };
}

export function readBrandingFromStorage(storageKey: string): BrandingState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublicViewPayload>;
    return toBrandingState(parsed);
  } catch {
    return null;
  }
}
