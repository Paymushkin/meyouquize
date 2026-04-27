import {
  normalizePublicViewState,
  SPEAKER_TILE_ID,
  type CloudWordCount,
  type PublicBanner,
  type PublicViewMode,
  type PublicViewPatch as SharedPublicViewPatch,
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
  | "voteProgressTrackColor"
  | "voteProgressBarColor"
  | "brandPrimaryColor"
  | "brandAccentColor"
  | "brandSurfaceColor"
  | "brandTextColor"
  | "brandFontFamily"
  | "brandFontUrl"
  | "brandLogoUrl"
  | "brandPlayerBackgroundImageUrl"
  | "brandProjectorBackgroundImageUrl"
  | "brandBodyBackgroundColor";

export type BrandingState = Pick<SharedPublicViewPayload, BrandingKeys>;

export type CloudManualStateByQuestion = Record<
  string,
  {
    hiddenTagTexts: string[];
    injectedTagWords: CloudWordCount[];
    tagCountOverrides: CloudWordCount[];
  }
>;

type PublicReactionWidget = {
  id: string;
  title: string;
  reactions: string[];
};

export const PROGRAM_TILE_ID = "program_tile";

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

export type { CloudWordCount, PublicBanner, PublicViewMode };
export { normalizePublicViewState, SPEAKER_TILE_ID };

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
    voteProgressTrackColor: view.voteProgressTrackColor,
    voteProgressBarColor: view.voteProgressBarColor,
    brandPrimaryColor: view.brandPrimaryColor,
    brandAccentColor: view.brandAccentColor,
    brandSurfaceColor: view.brandSurfaceColor,
    brandTextColor: view.brandTextColor,
    brandFontFamily: view.brandFontFamily,
    brandFontUrl: view.brandFontUrl,
    brandLogoUrl: view.brandLogoUrl,
    brandPlayerBackgroundImageUrl: view.brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: view.brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor: view.brandBodyBackgroundColor,
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

export function readCloudManualFromStorage(storageKey: string): CloudManualStateByQuestion {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CloudManualStateByQuestion;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}
