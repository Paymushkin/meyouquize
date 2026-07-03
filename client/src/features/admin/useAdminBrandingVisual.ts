import type { BrandThemeId, PublicViewPayload } from "@meyouquize/shared";
import { getBrandThemePatchForTheme } from "../branding/applyBrandThemeVisual";
import { useBrandingEditorState } from "../branding/useBrandingEditorState";
import { useCallback, type MutableRefObject } from "react";
import type { PublicViewSetPatch } from "../../publicViewContract";
import type { AdminBrandingTileSetters } from "./applyAdminBrandingVisualFromPublicView";

type EmitBrandingPatch = (patch: PublicViewSetPatch) => void;

type TileBrandSettersRef = MutableRefObject<AdminBrandingTileSetters>;

type Params = {
  emitBrandingPatchRef: MutableRefObject<EmitBrandingPatch>;
  tileBrandSettersRef: TileBrandSettersRef;
};

export function useAdminBrandingVisual({ emitBrandingPatchRef, tileBrandSettersRef }: Params) {
  const editor = useBrandingEditorState();

  const applyFromPublicView = useCallback(
    (pv: PublicViewPayload) => {
      editor.applyFromPublicView(pv, tileBrandSettersRef.current);
    },
    [editor.applyFromPublicView, tileBrandSettersRef],
  );

  const handleBrandThemeChange = useCallback(
    (theme: BrandThemeId) => {
      if (theme === editor.brandTheme) return;
      editor.applyBrandThemeLocally(theme);
      emitBrandingPatchRef.current(getBrandThemePatchForTheme(theme));
    },
    [editor, emitBrandingPatchRef],
  );

  return {
    projectorBackground: editor.projectorBackground,
    setProjectorBackground: editor.setProjectorBackground,
    cloudQuestionColor: editor.cloudQuestionColor,
    setCloudQuestionColor: editor.setCloudQuestionColor,
    cloudTagColors: editor.cloudTagColors,
    setCloudTagColors: editor.setCloudTagColors,
    cloudTopTagColor: editor.cloudTopTagColor,
    setCloudTopTagColor: editor.setCloudTopTagColor,
    cloudCorrectTagColor: editor.cloudCorrectTagColor,
    setCloudCorrectTagColor: editor.setCloudCorrectTagColor,
    cloudDensity: editor.cloudDensity,
    setCloudDensity: editor.setCloudDensity,
    cloudTagPadding: editor.cloudTagPadding,
    setCloudTagPadding: editor.setCloudTagPadding,
    cloudSpiral: editor.cloudSpiral,
    setCloudSpiral: editor.setCloudSpiral,
    cloudAnimationStrength: editor.cloudAnimationStrength,
    setCloudAnimationStrength: editor.setCloudAnimationStrength,
    voteQuestionTextColor: editor.voteQuestionTextColor,
    setVoteQuestionTextColor: editor.setVoteQuestionTextColor,
    voteOptionTextColor: editor.voteOptionTextColor,
    setVoteOptionTextColor: editor.setVoteOptionTextColor,
    voteOptionBorderColor: editor.voteOptionBorderColor,
    setVoteOptionBorderColor: editor.setVoteOptionBorderColor,
    voteProgressTrackColor: editor.voteProgressTrackColor,
    setVoteProgressTrackColor: editor.setVoteProgressTrackColor,
    voteProgressBarColor: editor.voteProgressBarColor,
    setVoteProgressBarColor: editor.setVoteProgressBarColor,
    playerVoteOptionTextColor: editor.playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor: editor.setPlayerVoteOptionTextColor,
    playerVoteProgressTrackColor: editor.playerVoteProgressTrackColor,
    setPlayerVoteProgressTrackColor: editor.setPlayerVoteProgressTrackColor,
    playerVoteProgressBarColor: editor.playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor: editor.setPlayerVoteProgressBarColor,
    brandPrimaryColor: editor.brandPrimaryColor,
    setBrandPrimaryColor: editor.setBrandPrimaryColor,
    brandAccentColor: editor.brandAccentColor,
    setBrandAccentColor: editor.setBrandAccentColor,
    brandSurfaceColor: editor.brandSurfaceColor,
    setBrandSurfaceColor: editor.setBrandSurfaceColor,
    brandTextColor: editor.brandTextColor,
    setBrandTextColor: editor.setBrandTextColor,
    brandInputTextColor: editor.brandInputTextColor,
    setBrandInputTextColor: editor.setBrandInputTextColor,
    brandFontFamily: editor.brandFontFamily,
    setBrandFontFamily: editor.setBrandFontFamily,
    brandFontUrl: editor.brandFontUrl,
    setBrandFontUrl: editor.setBrandFontUrl,
    brandFontUrls: editor.brandFontUrls,
    setBrandFontUrls: editor.setBrandFontUrls,
    brandLogoUrl: editor.brandLogoUrl,
    setBrandLogoUrl: editor.setBrandLogoUrl,
    brandPlayerBackgroundImageUrl: editor.brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl: editor.setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: editor.brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl: editor.setBrandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor: editor.brandBodyBackgroundColor,
    setBrandBodyBackgroundColor: editor.setBrandBodyBackgroundColor,
    brandTheme: editor.brandTheme,
    setBrandTheme: editor.setBrandTheme,
    projectorJoinQrVisible: editor.projectorJoinQrVisible,
    setProjectorJoinQrVisible: editor.setProjectorJoinQrVisible,
    projectorJoinQrText: editor.projectorJoinQrText,
    setProjectorJoinQrText: editor.setProjectorJoinQrText,
    projectorJoinQrTextColor: editor.projectorJoinQrTextColor,
    setProjectorJoinQrTextColor: editor.setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx: editor.projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx: editor.setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx: editor.projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx: editor.setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner: editor.projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner: editor.setProjectorJoinQrOverlayCorner,
    applyFromPublicView,
    handleBrandThemeChange,
    applyFromEventThemeBranding: editor.applyFromEventThemeBranding,
    applyBrandThemeLocally: editor.applyBrandThemeLocally,
    brandThemeVisualSetters: editor.brandThemeVisualSetters,
  };
}
