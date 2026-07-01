import type { PublicViewPayload } from "@meyouquize/shared";
import { toBrandingState } from "../../publicViewContract";

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export type AdminBrandingVisualSetters = {
  setProjectorBackground: (value: string) => void;
  setCloudQuestionColor: (value: string) => void;
  setCloudTagColors: (value: string[]) => void;
  setCloudTopTagColor: (value: string) => void;
  setCloudCorrectTagColor: (value: string) => void;
  setCloudDensity: (value: number) => void;
  setCloudTagPadding: (value: number) => void;
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  setCloudAnimationStrength: (value: number) => void;
  setVoteQuestionTextColor: (value: string) => void;
  setVoteOptionTextColor: (value: string) => void;
  setVoteOptionBorderColor: (value: string) => void;
  setVoteProgressTrackColor: (value: string) => void;
  setVoteProgressBarColor: (value: string) => void;
  setPlayerVoteOptionTextColor: (value: string) => void;
  setPlayerVoteProgressTrackColor: (value: string) => void;
  setPlayerVoteProgressBarColor: (value: string) => void;
  setBrandPrimaryColor: (value: string) => void;
  setBrandAccentColor: (value: string) => void;
  setBrandSurfaceColor: (value: string) => void;
  setBrandTextColor: (value: string) => void;
  setBrandInputTextColor: (value: string) => void;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandLogoUrl: (value: string) => void;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  setBrandBodyBackgroundColor: (value: string) => void;
  setBrandTheme: (value: import("@meyouquize/shared").BrandThemeId) => void;
};

export function applyAdminBrandingVisualFromPublicView(
  pv: PublicViewPayload,
  setters: AdminBrandingVisualSetters,
) {
  const b = toBrandingState(pv);
  setters.setProjectorBackground(b.projectorBackground);
  setters.setCloudQuestionColor(b.cloudQuestionColor);
  setters.setCloudTagColors(b.cloudTagColors);
  setters.setCloudTopTagColor(b.cloudTopTagColor);
  setters.setCloudCorrectTagColor(b.cloudCorrectTagColor);
  setters.setCloudDensity(clampInt(b.cloudDensity, 0, 100));
  setters.setCloudTagPadding(clampInt(b.cloudTagPadding, 0, 40));
  setters.setCloudSpiral(b.cloudSpiral);
  setters.setCloudAnimationStrength(clampInt(b.cloudAnimationStrength, 0, 100));
  setters.setVoteQuestionTextColor(b.voteQuestionTextColor);
  setters.setVoteOptionTextColor(b.voteOptionTextColor);
  setters.setVoteOptionBorderColor(b.voteOptionBorderColor);
  setters.setVoteProgressTrackColor(b.voteProgressTrackColor);
  setters.setVoteProgressBarColor(b.voteProgressBarColor);
  setters.setPlayerVoteOptionTextColor(b.playerVoteOptionTextColor);
  setters.setPlayerVoteProgressTrackColor(b.playerVoteProgressTrackColor);
  setters.setPlayerVoteProgressBarColor(b.playerVoteProgressBarColor);
  setters.setBrandPrimaryColor(b.brandPrimaryColor);
  setters.setBrandAccentColor(b.brandAccentColor);
  setters.setBrandSurfaceColor(b.brandSurfaceColor);
  setters.setBrandTextColor(b.brandTextColor);
  setters.setBrandInputTextColor(b.brandInputTextColor);
  setters.setBrandFontFamily(b.brandFontFamily);
  setters.setBrandFontUrl(b.brandFontUrl);
  setters.setBrandLogoUrl(b.brandLogoUrl);
  setters.setBrandPlayerBackgroundImageUrl(b.brandPlayerBackgroundImageUrl);
  setters.setBrandProjectorBackgroundImageUrl(b.brandProjectorBackgroundImageUrl);
  setters.setBrandBodyBackgroundColor(b.brandBodyBackgroundColor);
  setters.setBrandTheme(b.brandTheme);
}
