import type { BrandThemeId } from "@meyouquize/shared";
import {
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  type ProjectorJoinQrOverlayCorner,
} from "@meyouquize/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import type { PublicViewPayload } from "../../publicViewContract";
import {
  applyBrandThemeVisualSetters,
  getBrandThemePatchForTheme,
  type BrandThemeVisualSetters,
} from "./applyBrandThemeVisual";
import {
  applyAdminBrandingVisualFromPublicView,
  type AdminBrandingVisualSetters,
  type AdminBrandingQrSetters,
  type AdminBrandingTileSetters,
} from "../admin/applyAdminBrandingVisualFromPublicView";
import {
  applyEventThemeBrandingFromPublicView,
  applyEventThemeBrandingToSetters,
  brandingEditorStateToEventThemeBranding,
} from "./applyEventThemeBranding";
import type { EventThemeBranding } from "@meyouquize/shared";

export function useBrandingEditorState() {
  const [projectorBackground, setProjectorBackground] = useState("#7c5acb");
  const [cloudQuestionColor, setCloudQuestionColor] = useState("#1f1f1f");
  const [cloudTagColors, setCloudTagColors] = useState<string[]>([
    "#1f1f1f",
    "#1976d2",
    "#2e7d32",
    "#ef6c00",
    "#6a1b9a",
  ]);
  const [cloudTopTagColor, setCloudTopTagColor] = useState("#d32f2f");
  const [cloudCorrectTagColor, setCloudCorrectTagColor] = useState("#2e7d32");
  const [cloudDensity, setCloudDensity] = useState(60);
  const [cloudTagPadding, setCloudTagPadding] = useState(5);
  const [cloudSpiral, setCloudSpiral] = useState<"archimedean" | "rectangular">("archimedean");
  const [cloudAnimationStrength, setCloudAnimationStrength] = useState(30);
  const [voteQuestionTextColor, setVoteQuestionTextColor] = useState("#1f1f1f");
  const [voteOptionTextColor, setVoteOptionTextColor] = useState("#1f1f1f");
  const [voteOptionBorderColor, setVoteOptionBorderColor] = useState("rgba(255,255,255,0.4)");
  const [voteProgressTrackColor, setVoteProgressTrackColor] = useState("#e3e3e3");
  const [voteProgressBarColor, setVoteProgressBarColor] = useState("#1976d2");
  const [playerVoteOptionTextColor, setPlayerVoteOptionTextColor] = useState("#ffffff");
  const [playerVoteProgressTrackColor, setPlayerVoteProgressTrackColor] = useState("#6a5600");
  const [playerVoteProgressBarColor, setPlayerVoteProgressBarColor] = useState("#F3F722");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#7c5acb");
  const [brandAccentColor, setBrandAccentColor] = useState("#1976d2");
  const [brandSurfaceColor, setBrandSurfaceColor] = useState("#ffffff");
  const [brandTextColor, setBrandTextColor] = useState("#1f1f1f");
  const [brandInputTextColor, setBrandInputTextColor] = useState("#ffffff");
  const [brandFontFamily, setBrandFontFamily] = useState("Jost, Arial, sans-serif");
  const [brandFontUrl, setBrandFontUrl] = useState("");
  const [brandFontUrls, setBrandFontUrls] = useState<string[]>([]);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPlayerBackgroundImageUrl, setBrandPlayerBackgroundImageUrl] = useState("");
  const [brandProjectorBackgroundImageUrl, setBrandProjectorBackgroundImageUrl] = useState("");
  const [brandBodyBackgroundColor, setBrandBodyBackgroundColor] = useState("#000000");
  const [brandTheme, setBrandTheme] = useState<BrandThemeId>("default");
  const [projectorJoinQrVisible, setProjectorJoinQrVisible] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  );
  const [projectorJoinQrText, setProjectorJoinQrText] = useState(DEFAULT_PROJECTOR_JOIN_QR_TEXT);
  const [projectorJoinQrTextColor, setProjectorJoinQrTextColor] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  );
  const [projectorJoinQrOverlaySizePx, setProjectorJoinQrOverlaySizePx] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  );
  const [projectorJoinQrOverlayInsetPx, setProjectorJoinQrOverlayInsetPx] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  );
  const [projectorJoinQrOverlayCorner, setProjectorJoinQrOverlayCorner] =
    useState<ProjectorJoinQrOverlayCorner>(DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER);
  const [speakerTileBackgroundColor, setSpeakerTileBackgroundColor] = useState("#1976d2");
  const [speakerTileTextColor, setSpeakerTileTextColor] = useState("#ffffff");
  const [programTileBackgroundColor, setProgramTileBackgroundColor] = useState("#ffffff");
  const [programTileTextColor, setProgramTileTextColor] = useState("#1f1f1f");

  const visualSettersRef = useRef<AdminBrandingVisualSetters>({
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudCorrectTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteOptionBorderColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setPlayerVoteOptionTextColor,
    setPlayerVoteProgressTrackColor,
    setPlayerVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandInputTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandFontUrls,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setBrandTheme,
  });
  visualSettersRef.current = {
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudCorrectTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteOptionBorderColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setPlayerVoteOptionTextColor,
    setPlayerVoteProgressTrackColor,
    setPlayerVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandInputTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandFontUrls,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setBrandTheme,
  };

  const qrSettersRef = useRef<AdminBrandingQrSetters>({
    setProjectorJoinQrVisible,
    setProjectorJoinQrText,
    setProjectorJoinQrTextColor,
    setProjectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayCorner,
  });
  qrSettersRef.current = {
    setProjectorJoinQrVisible,
    setProjectorJoinQrText,
    setProjectorJoinQrTextColor,
    setProjectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayCorner,
  };

  const tileSettersRef = useRef<AdminBrandingTileSetters>({
    setSpeakerTileBackgroundColor,
    setSpeakerTileTextColor,
    setProgramTileBackgroundColor,
    setProgramTileTextColor,
  });
  tileSettersRef.current = {
    setSpeakerTileBackgroundColor,
    setSpeakerTileTextColor,
    setProgramTileBackgroundColor,
    setProgramTileTextColor,
  };

  const brandThemeVisualSetters = useMemo((): BrandThemeVisualSetters => {
    return {
      setProjectorBackground,
      setVoteQuestionTextColor,
      setVoteOptionTextColor,
      setVoteProgressTrackColor,
      setVoteProgressBarColor,
      setPlayerVoteOptionTextColor,
      setPlayerVoteProgressTrackColor,
      setPlayerVoteProgressBarColor,
      setBrandPrimaryColor,
      setBrandAccentColor,
      setBrandSurfaceColor,
      setBrandTextColor,
      setBrandInputTextColor,
      setBrandFontFamily,
      setBrandFontUrl,
      setBrandLogoUrl,
      setBrandPlayerBackgroundImageUrl,
      setBrandProjectorBackgroundImageUrl,
      setBrandBodyBackgroundColor,
      setSpeakerTileBackgroundColor,
      setSpeakerTileTextColor,
      setProgramTileBackgroundColor,
      setProgramTileTextColor,
    };
  }, [
    setProjectorBackground,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setPlayerVoteOptionTextColor,
    setPlayerVoteProgressTrackColor,
    setPlayerVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandInputTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandFontUrls,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setSpeakerTileBackgroundColor,
    setSpeakerTileTextColor,
    setProgramTileBackgroundColor,
    setProgramTileTextColor,
  ]);

  const applyFromPublicView = useCallback(
    (pv: PublicViewPayload, tileSetters?: AdminBrandingTileSetters) => {
      applyAdminBrandingVisualFromPublicView(pv, visualSettersRef.current, {
        qrSetters: qrSettersRef.current,
        tileSetters: tileSetters ?? tileSettersRef.current,
      });
    },
    [],
  );

  const applyFromEventThemeBranding = useCallback((branding: EventThemeBranding) => {
    applyEventThemeBrandingToSetters(branding, {
      ...visualSettersRef.current,
      ...qrSettersRef.current,
      ...tileSettersRef.current,
    });
  }, []);

  const applyBrandThemeLocally = useCallback(
    (theme: BrandThemeId) => {
      if (theme === brandTheme) return;
      const patch = getBrandThemePatchForTheme(theme);
      setBrandTheme(theme);
      applyBrandThemeVisualSetters(patch, brandThemeVisualSetters);
    },
    [brandTheme, brandThemeVisualSetters],
  );

  const toEventThemeBranding = useCallback((): EventThemeBranding => {
    return brandingEditorStateToEventThemeBranding({
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
      playerVoteOptionTextColor,
      playerVoteProgressTrackColor,
      playerVoteProgressBarColor,
      brandPrimaryColor,
      brandAccentColor,
      brandSurfaceColor,
      brandTextColor,
      brandInputTextColor,
      brandFontFamily,
      brandFontUrl,
      brandFontUrls,
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
      speakerTileBackgroundColor,
      speakerTileTextColor,
      programTileBackgroundColor,
      programTileTextColor,
    });
  }, [
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
    playerVoteOptionTextColor,
    playerVoteProgressTrackColor,
    playerVoteProgressBarColor,
    brandPrimaryColor,
    brandAccentColor,
    brandSurfaceColor,
    brandTextColor,
    brandInputTextColor,
    brandFontFamily,
    brandFontUrl,
    brandFontUrls,
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
    speakerTileBackgroundColor,
    speakerTileTextColor,
    programTileBackgroundColor,
    programTileTextColor,
  ]);

  return {
    projectorBackground,
    setProjectorBackground,
    cloudQuestionColor,
    setCloudQuestionColor,
    cloudTagColors,
    setCloudTagColors,
    cloudTopTagColor,
    setCloudTopTagColor,
    cloudCorrectTagColor,
    setCloudCorrectTagColor,
    cloudDensity,
    setCloudDensity,
    cloudTagPadding,
    setCloudTagPadding,
    cloudSpiral,
    setCloudSpiral,
    cloudAnimationStrength,
    setCloudAnimationStrength,
    voteQuestionTextColor,
    setVoteQuestionTextColor,
    voteOptionTextColor,
    setVoteOptionTextColor,
    voteOptionBorderColor,
    setVoteOptionBorderColor,
    voteProgressTrackColor,
    setVoteProgressTrackColor,
    voteProgressBarColor,
    setVoteProgressBarColor,
    playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor,
    playerVoteProgressTrackColor,
    setPlayerVoteProgressTrackColor,
    playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor,
    brandPrimaryColor,
    setBrandPrimaryColor,
    brandAccentColor,
    setBrandAccentColor,
    brandSurfaceColor,
    setBrandSurfaceColor,
    brandTextColor,
    setBrandTextColor,
    brandInputTextColor,
    setBrandInputTextColor,
    brandFontFamily,
    setBrandFontFamily,
    brandFontUrl,
    setBrandFontUrl,
    brandFontUrls,
    setBrandFontUrls,
    brandLogoUrl,
    setBrandLogoUrl,
    brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor,
    setBrandBodyBackgroundColor,
    brandTheme,
    setBrandTheme,
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
    speakerTileBackgroundColor,
    setSpeakerTileBackgroundColor,
    speakerTileTextColor,
    setSpeakerTileTextColor,
    programTileBackgroundColor,
    setProgramTileBackgroundColor,
    programTileTextColor,
    setProgramTileTextColor,
    brandThemeVisualSetters,
    applyFromPublicView,
    applyFromEventThemeBranding,
    applyBrandThemeLocally,
    toEventThemeBranding,
    applyEventThemeBrandingFromPublicView,
  };
}
