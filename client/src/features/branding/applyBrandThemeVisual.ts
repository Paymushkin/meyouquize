import {
  getBrandThemeVisualPatch,
  type BrandThemeId,
  type BrandThemeVisualState,
} from "@meyouquize/shared";

export type BrandThemeVisualSetters = {
  setProjectorBackground: (value: string) => void;
  setVoteQuestionTextColor: (value: string) => void;
  setVoteOptionTextColor: (value: string) => void;
  setVoteProgressTrackColor: (value: string) => void;
  setVoteProgressBarColor: (value: string) => void;
  setPlayerVoteOptionTextColor: (value: string) => void;
  setPlayerVoteProgressTrackColor: (value: string) => void;
  setPlayerVoteProgressBarColor: (value: string) => void;
  setBrandPrimaryColor: (value: string) => void;
  setBrandAccentColor: (value: string) => void;
  setBrandSurfaceColor: (value: string) => void;
  setBrandTextColor: (value: string) => void;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandLogoUrl: (value: string) => void;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  setBrandBodyBackgroundColor: (value: string) => void;
  setSpeakerTileBackgroundColor: (value: string) => void;
  setSpeakerTileTextColor: (value: string) => void;
  setProgramTileBackgroundColor: (value: string) => void;
  setProgramTileTextColor: (value: string) => void;
};

export function getBrandThemePatchForTheme(theme: BrandThemeId) {
  return getBrandThemeVisualPatch(theme);
}

export function applyBrandThemeVisualSetters(
  visual: BrandThemeVisualState,
  setters: BrandThemeVisualSetters,
): void {
  setters.setProjectorBackground(visual.projectorBackground);
  setters.setVoteQuestionTextColor(visual.voteQuestionTextColor);
  setters.setVoteOptionTextColor(visual.voteOptionTextColor);
  setters.setVoteProgressTrackColor(visual.voteProgressTrackColor);
  setters.setVoteProgressBarColor(visual.voteProgressBarColor);
  setters.setPlayerVoteOptionTextColor(visual.playerVoteOptionTextColor);
  setters.setPlayerVoteProgressTrackColor(visual.playerVoteProgressTrackColor);
  setters.setPlayerVoteProgressBarColor(visual.playerVoteProgressBarColor);
  setters.setBrandPrimaryColor(visual.brandPrimaryColor);
  setters.setBrandAccentColor(visual.brandAccentColor);
  setters.setBrandSurfaceColor(visual.brandSurfaceColor);
  setters.setBrandTextColor(visual.brandTextColor);
  setters.setBrandFontFamily(visual.brandFontFamily);
  setters.setBrandFontUrl(visual.brandFontUrl);
  setters.setBrandLogoUrl(visual.brandLogoUrl);
  setters.setBrandPlayerBackgroundImageUrl(visual.brandPlayerBackgroundImageUrl);
  setters.setBrandProjectorBackgroundImageUrl(visual.brandProjectorBackgroundImageUrl);
  setters.setBrandBodyBackgroundColor(visual.brandBodyBackgroundColor);
  setters.setSpeakerTileBackgroundColor(visual.speakerTileBackgroundColor);
  setters.setSpeakerTileTextColor(visual.speakerTileTextColor);
  setters.setProgramTileBackgroundColor(visual.programTileBackgroundColor);
  setters.setProgramTileTextColor(visual.programTileTextColor);
}
