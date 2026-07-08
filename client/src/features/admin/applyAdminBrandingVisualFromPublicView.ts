import { normalizePublicViewState, type BrandThemeId } from "@meyouquize/shared";
import type { ProjectorJoinQrOverlayCorner, PublicViewPayload } from "../../publicViewContract";
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
  setBrandFontUrls: (value: string[]) => void;
  setBrandLogoUrl: (value: string) => void;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  setBrandBodyBackgroundColor: (value: string) => void;
  setBrandTheme: (value: BrandThemeId) => void;
};

export type AdminBrandingQrSetters = {
  setProjectorJoinQrVisible: (value: boolean) => void;
  setProjectorJoinQrOverlayVisible: (value: boolean) => void;
  setProjectorJoinQrText: (value: string) => void;
  setProjectorJoinQrTextColor: (value: string) => void;
  setProjectorJoinQrOverlaySizePx: (value: number) => void;
  setProjectorJoinQrOverlayInsetVerticalPx: (value: number) => void;
  setProjectorJoinQrOverlayInsetHorizontalPx: (value: number) => void;
  setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
};

export type AdminBrandingTileSetters = {
  setSpeakerTileBackgroundColor: (value: string) => void;
  setSpeakerTileTextColor: (value: string) => void;
  setProgramTileBackgroundColor: (value: string) => void;
  setProgramTileTextColor: (value: string) => void;
};

type ApplyOptions = {
  qrSetters?: AdminBrandingQrSetters;
  tileSetters?: AdminBrandingTileSetters;
};

export function applyAdminBrandingVisualFromPublicView(
  pv: PublicViewPayload,
  setters: AdminBrandingVisualSetters,
  options?: ApplyOptions,
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
  const normalized = normalizePublicViewState(pv);
  setters.setBrandFontUrls(normalized.brandFontUrls ?? []);
  setters.setBrandLogoUrl(b.brandLogoUrl);
  setters.setBrandPlayerBackgroundImageUrl(b.brandPlayerBackgroundImageUrl);
  setters.setBrandProjectorBackgroundImageUrl(b.brandProjectorBackgroundImageUrl);
  setters.setBrandBodyBackgroundColor(b.brandBodyBackgroundColor);
  setters.setBrandTheme(b.brandTheme);

  if (options?.qrSetters || options?.tileSetters) {
    const normalized = normalizePublicViewState(pv);
    if (options.qrSetters) {
      options.qrSetters.setProjectorJoinQrVisible(normalized.projectorJoinQrVisible);
      options.qrSetters.setProjectorJoinQrOverlayVisible(normalized.projectorJoinQrOverlayVisible);
      options.qrSetters.setProjectorJoinQrText(normalized.projectorJoinQrText);
      options.qrSetters.setProjectorJoinQrTextColor(normalized.projectorJoinQrTextColor);
      options.qrSetters.setProjectorJoinQrOverlaySizePx(normalized.projectorJoinQrOverlaySizePx);
      options.qrSetters.setProjectorJoinQrOverlayInsetVerticalPx(
        normalized.projectorJoinQrOverlayInsetVerticalPx,
      );
      options.qrSetters.setProjectorJoinQrOverlayInsetHorizontalPx(
        normalized.projectorJoinQrOverlayInsetHorizontalPx,
      );
      options.qrSetters.setProjectorJoinQrOverlayCorner(normalized.projectorJoinQrOverlayCorner);
    }
    if (options.tileSetters) {
      options.tileSetters.setSpeakerTileBackgroundColor(normalized.speakerTileBackgroundColor);
      options.tileSetters.setSpeakerTileTextColor(normalized.speakerTileTextColor);
      options.tileSetters.setProgramTileBackgroundColor(normalized.programTileBackgroundColor);
      options.tileSetters.setProgramTileTextColor(normalized.programTileTextColor);
    }
  }
}
