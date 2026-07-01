import type { BrandThemeId, PublicViewPayload } from "@meyouquize/shared";
import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { PublicViewSetPatch } from "../../publicViewContract";
import {
  applyBrandThemeVisualSetters,
  getBrandThemePatchForTheme,
  type BrandThemeVisualSetters,
} from "../branding/applyBrandThemeVisual";
import { applyAdminBrandingVisualFromPublicView } from "./applyAdminBrandingVisualFromPublicView";

type EmitBrandingPatch = (patch: PublicViewSetPatch) => void;

type TileBrandSettersRef = MutableRefObject<{
  setSpeakerTileBackgroundColor: (value: string) => void;
  setSpeakerTileTextColor: (value: string) => void;
  setProgramTileBackgroundColor: (value: string) => void;
  setProgramTileTextColor: (value: string) => void;
}>;

type Params = {
  emitBrandingPatchRef: MutableRefObject<EmitBrandingPatch>;
  tileBrandSettersRef: TileBrandSettersRef;
};

export function useAdminBrandingVisual({ emitBrandingPatchRef, tileBrandSettersRef }: Params) {
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
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPlayerBackgroundImageUrl, setBrandPlayerBackgroundImageUrl] = useState("");
  const [brandProjectorBackgroundImageUrl, setBrandProjectorBackgroundImageUrl] = useState("");
  const [brandBodyBackgroundColor, setBrandBodyBackgroundColor] = useState("#000000");
  const [brandTheme, setBrandTheme] = useState<BrandThemeId>("default");

  const visualSettersRef = useRef({
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
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setBrandTheme,
  };

  const applyFromPublicView = useCallback((pv: PublicViewPayload) => {
    applyAdminBrandingVisualFromPublicView(pv, visualSettersRef.current);
  }, []);

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
      setSpeakerTileBackgroundColor: (value) =>
        tileBrandSettersRef.current.setSpeakerTileBackgroundColor(value),
      setSpeakerTileTextColor: (value) =>
        tileBrandSettersRef.current.setSpeakerTileTextColor(value),
      setProgramTileBackgroundColor: (value) =>
        tileBrandSettersRef.current.setProgramTileBackgroundColor(value),
      setProgramTileTextColor: (value) =>
        tileBrandSettersRef.current.setProgramTileTextColor(value),
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
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    tileBrandSettersRef,
  ]);

  const handleBrandThemeChange = useCallback(
    (theme: BrandThemeId) => {
      if (theme === brandTheme) return;
      const patch = getBrandThemePatchForTheme(theme);
      setBrandTheme(theme);
      applyBrandThemeVisualSetters(patch, brandThemeVisualSetters);
      emitBrandingPatchRef.current(patch);
    },
    [brandTheme, brandThemeVisualSetters, emitBrandingPatchRef],
  );

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
    applyFromPublicView,
    handleBrandThemeChange,
  };
}
