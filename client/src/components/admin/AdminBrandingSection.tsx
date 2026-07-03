import { type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { PublicViewSetPatch, ProjectorJoinQrOverlayCorner } from "../../publicViewContract";
import { BrandFontsSection } from "./branding/BrandFontsSection";
import { BrandImagesSection } from "./branding/BrandImagesSection";
import { BrandPlayerUiResultsSection } from "./branding/BrandPlayerUiResultsSection";
import { BrandProjectorJoinQrSection } from "./branding/BrandProjectorJoinQrSection";
import { BrandScreenColorsSection } from "./branding/BrandScreenColorsSection";
import { BrandTagCloudSection } from "./branding/BrandTagCloudSection";
import { BrandThemeSection } from "./branding/BrandThemeSection";
import { BrandTileColorsSection } from "./branding/BrandTileColorsSection";
import {
  EventThemeApplySection,
  type EventThemeListOption,
  type EventThemeSelection,
} from "./branding/EventThemeApplySection";
import type { BrandThemeId } from "@meyouquize/shared";

type Props = {
  brandTheme: BrandThemeId;
  onBrandThemeChange: (theme: BrandThemeId) => void;
  projectorBackground: string;
  setProjectorBackground: (value: string) => void;
  brandBodyBackgroundColor: string;
  setBrandBodyBackgroundColor: (value: string) => void;
  voteQuestionTextColor: string;
  setVoteQuestionTextColor: (value: string) => void;
  voteOptionTextColor: string;
  setVoteOptionTextColor: (value: string) => void;
  voteOptionBorderColor: string;
  setVoteOptionBorderColor: (value: string) => void;
  voteProgressTrackColor: string;
  setVoteProgressTrackColor: (value: string) => void;
  voteProgressBarColor: string;
  setVoteProgressBarColor: (value: string) => void;
  playerVoteOptionTextColor: string;
  setPlayerVoteOptionTextColor: (value: string) => void;
  playerVoteProgressBarColor: string;
  setPlayerVoteProgressBarColor: (value: string) => void;
  qrSettingsProps: {
    projectorJoinQrVisible: boolean;
    setProjectorJoinQrVisible: (value: boolean) => void;
    projectorJoinQrText: string;
    setProjectorJoinQrText: (value: string) => void;
    projectorJoinQrTextColor: string;
    setProjectorJoinQrTextColor: (value: string) => void;
    projectorJoinQrOverlaySizePx: number;
    setProjectorJoinQrOverlaySizePx: (value: number) => void;
    projectorJoinQrOverlayInsetPx: number;
    setProjectorJoinQrOverlayInsetPx: (value: number) => void;
    projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
    setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
  };
  cloudQuestionColor: string;
  setCloudQuestionColor: (value: string) => void;
  cloudTopTagColor: string;
  setCloudTopTagColor: (value: string) => void;
  cloudCorrectTagColor: string;
  setCloudCorrectTagColor: (value: string) => void;
  cloudTagColors: string[];
  setCloudTagColors: Dispatch<SetStateAction<string[]>>;
  cloudDensity: number;
  setCloudDensity: (value: number) => void;
  cloudTagPadding: number;
  setCloudTagPadding: (value: number) => void;
  cloudSpiral: "archimedean" | "rectangular";
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  cloudAnimationStrength: number;
  setCloudAnimationStrength: (value: number) => void;
  brandPrimaryColor: string;
  setBrandPrimaryColor: (value: string) => void;
  brandAccentColor: string;
  setBrandAccentColor: (value: string) => void;
  brandSurfaceColor: string;
  setBrandSurfaceColor: (value: string) => void;
  brandTextColor: string;
  setBrandTextColor: (value: string) => void;
  brandInputTextColor: string;
  setBrandInputTextColor: (value: string) => void;
  brandFontFamily: string;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandFontUrls: (value: string[]) => void;
  availableFonts: Array<{ id: string; family: string; url: string; kind: "static" | "variable" }>;
  onUploadMediaError: (message: string) => void;
  brandLogoUrl: string;
  setBrandLogoUrl: (value: string) => void;
  brandPlayerBackgroundImageUrl: string;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  brandProjectorBackgroundImageUrl: string;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  onUploadMedia: (file: File) => Promise<string>;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
  eventThemeApplyProps?: {
    customThemes: EventThemeListOption[];
    themesLoading?: boolean;
    appliedEventThemeName?: string;
    onApply: (selection: EventThemeSelection) => void | Promise<void>;
  };
  tileColorsProps?: {
    speakerTileBackgroundColor: string;
    setSpeakerTileBackgroundColor: (value: string) => void;
    speakerTileTextColor: string;
    setSpeakerTileTextColor: (value: string) => void;
    programTileBackgroundColor: string;
    setProgramTileBackgroundColor: (value: string) => void;
    programTileTextColor: string;
    setProgramTileTextColor: (value: string) => void;
  };
};

export function AdminBrandingSection(props: Props) {
  const {
    brandTheme,
    onBrandThemeChange,
    projectorBackground,
    setProjectorBackground,
    brandBodyBackgroundColor,
    setBrandBodyBackgroundColor,
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
    playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor,
    qrSettingsProps,
    cloudQuestionColor,
    setCloudQuestionColor,
    cloudTopTagColor,
    setCloudTopTagColor,
    cloudCorrectTagColor,
    setCloudCorrectTagColor,
    cloudTagColors,
    setCloudTagColors,
    cloudDensity,
    setCloudDensity,
    cloudTagPadding,
    setCloudTagPadding,
    cloudSpiral,
    setCloudSpiral,
    cloudAnimationStrength,
    setCloudAnimationStrength,
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
    setBrandFontUrl,
    setBrandFontUrls,
    availableFonts,
    onUploadMediaError,
    brandLogoUrl,
    setBrandLogoUrl,
    brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    onUploadMedia,
    emitBrandingPatch,
    eventThemeApplyProps,
    tileColorsProps,
  } = props;

  const colorGridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 1,
    alignItems: "center",
  } as const;
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Брендирование
        </Typography>
        <Stack spacing={1}>
          {eventThemeApplyProps ? (
            <EventThemeApplySection {...eventThemeApplyProps} />
          ) : (
            <BrandThemeSection brandTheme={brandTheme} onThemeChange={onBrandThemeChange} />
          )}
          <BrandScreenColorsSection
            colorGridSx={colorGridSx}
            projectorBackground={projectorBackground}
            setProjectorBackground={setProjectorBackground}
            brandBodyBackgroundColor={brandBodyBackgroundColor}
            setBrandBodyBackgroundColor={setBrandBodyBackgroundColor}
            voteQuestionTextColor={voteQuestionTextColor}
            setVoteQuestionTextColor={setVoteQuestionTextColor}
            voteOptionTextColor={voteOptionTextColor}
            setVoteOptionTextColor={setVoteOptionTextColor}
            voteOptionBorderColor={voteOptionBorderColor}
            setVoteOptionBorderColor={setVoteOptionBorderColor}
            voteProgressTrackColor={voteProgressTrackColor}
            setVoteProgressTrackColor={setVoteProgressTrackColor}
            voteProgressBarColor={voteProgressBarColor}
            setVoteProgressBarColor={setVoteProgressBarColor}
            emitPatch={emitBrandingPatch}
          />
          <BrandTagCloudSection
            colorGridSx={colorGridSx}
            cloudQuestionColor={cloudQuestionColor}
            setCloudQuestionColor={setCloudQuestionColor}
            cloudTopTagColor={cloudTopTagColor}
            setCloudTopTagColor={setCloudTopTagColor}
            cloudCorrectTagColor={cloudCorrectTagColor}
            setCloudCorrectTagColor={setCloudCorrectTagColor}
            cloudTagColors={cloudTagColors}
            setCloudTagColors={setCloudTagColors}
            cloudDensity={cloudDensity}
            setCloudDensity={setCloudDensity}
            cloudTagPadding={cloudTagPadding}
            setCloudTagPadding={setCloudTagPadding}
            cloudSpiral={cloudSpiral}
            setCloudSpiral={setCloudSpiral}
            cloudAnimationStrength={cloudAnimationStrength}
            setCloudAnimationStrength={setCloudAnimationStrength}
            emitPatch={emitBrandingPatch}
          />
          <BrandPlayerUiResultsSection
            colorGridSx={colorGridSx}
            playerVoteOptionTextColor={playerVoteOptionTextColor}
            setPlayerVoteOptionTextColor={setPlayerVoteOptionTextColor}
            playerVoteProgressBarColor={playerVoteProgressBarColor}
            setPlayerVoteProgressBarColor={setPlayerVoteProgressBarColor}
            emitPatch={emitBrandingPatch}
          />
          <BrandProjectorJoinQrSection {...qrSettingsProps} emitPatch={emitBrandingPatch} />
          {tileColorsProps ? (
            <BrandTileColorsSection
              colorGridSx={colorGridSx}
              {...tileColorsProps}
              emitPatch={emitBrandingPatch}
            />
          ) : null}
          <BrandFontsSection
            brandFontFamily={brandFontFamily}
            setBrandFontFamily={setBrandFontFamily}
            setBrandFontUrl={setBrandFontUrl}
            setBrandFontUrls={setBrandFontUrls}
            availableFonts={availableFonts}
            emitPatch={emitBrandingPatch}
          />
          <BrandImagesSection
            colorGridSx={colorGridSx}
            brandPrimaryColor={brandPrimaryColor}
            setBrandPrimaryColor={setBrandPrimaryColor}
            brandAccentColor={brandAccentColor}
            setBrandAccentColor={setBrandAccentColor}
            brandSurfaceColor={brandSurfaceColor}
            setBrandSurfaceColor={setBrandSurfaceColor}
            brandTextColor={brandTextColor}
            setBrandTextColor={setBrandTextColor}
            brandInputTextColor={brandInputTextColor}
            setBrandInputTextColor={setBrandInputTextColor}
            brandLogoUrl={brandLogoUrl}
            setBrandLogoUrl={setBrandLogoUrl}
            brandPlayerBackgroundImageUrl={brandPlayerBackgroundImageUrl}
            setBrandPlayerBackgroundImageUrl={setBrandPlayerBackgroundImageUrl}
            brandProjectorBackgroundImageUrl={brandProjectorBackgroundImageUrl}
            setBrandProjectorBackgroundImageUrl={setBrandProjectorBackgroundImageUrl}
            onUploadMedia={onUploadMedia}
            onUploadFontError={onUploadMediaError}
            emitPatch={emitBrandingPatch}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
