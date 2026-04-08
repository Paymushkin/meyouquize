import {
  normalizePublicViewState,
  type CloudWordCount,
  type PublicViewMode,
  type PublicViewPatch,
  type PublicViewPayload,
} from "@meyouquize/shared";

export type BrandingState = {
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
};

export type CloudManualStateByQuestion = Record<string, {
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
}>;

export type PublicViewSetPatch = PublicViewPatch;
export type { CloudWordCount, PublicViewMode, PublicViewPayload };
export { normalizePublicViewState };

export function toBrandingState(payload: Partial<PublicViewPayload>): BrandingState {
  const view = normalizePublicViewState(payload);
  return {
    projectorBackground: view.projectorBackground,
    cloudQuestionColor: view.cloudQuestionColor,
    cloudTagColors: view.cloudTagColors,
    cloudTopTagColor: view.cloudTopTagColor,
    cloudDensity: view.cloudDensity,
    cloudTagPadding: view.cloudTagPadding,
    cloudSpiral: view.cloudSpiral,
    cloudAnimationStrength: view.cloudAnimationStrength,
    voteQuestionTextColor: view.voteQuestionTextColor,
    voteOptionTextColor: view.voteOptionTextColor,
    voteProgressTrackColor: view.voteProgressTrackColor,
    voteProgressBarColor: view.voteProgressBarColor,
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
