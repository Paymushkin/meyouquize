import { type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { PublicViewSetPatch } from "../../publicViewContract";
import { BrandFontsSection } from "./branding/BrandFontsSection";
import { BrandImagesSection } from "./branding/BrandImagesSection";
import { BrandScreenColorsSection } from "./branding/BrandScreenColorsSection";
import { BrandTagCloudSection } from "./branding/BrandTagCloudSection";

type Props = {
  projectorBackground: string;
  setProjectorBackground: (value: string) => void;
  brandBodyBackgroundColor: string;
  setBrandBodyBackgroundColor: (value: string) => void;
  voteQuestionTextColor: string;
  setVoteQuestionTextColor: (value: string) => void;
  voteOptionTextColor: string;
  setVoteOptionTextColor: (value: string) => void;
  voteProgressTrackColor: string;
  setVoteProgressTrackColor: (value: string) => void;
  voteProgressBarColor: string;
  setVoteProgressBarColor: (value: string) => void;
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
  brandFontFamily: string;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  availableFonts: Array<{ id: string; family: string; url: string; kind: "static" | "variable" }>;
  onUploadFont: (
    files: File[],
    family: string,
    kind: "static" | "variable",
  ) => Promise<{ family: string; url: string }>;
  onUploadFontError: (message: string) => void;
  brandLogoUrl: string;
  setBrandLogoUrl: (value: string) => void;
  brandPlayerBackgroundImageUrl: string;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  brandProjectorBackgroundImageUrl: string;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  onUploadMedia: (file: File) => Promise<string>;
  brandBackgroundOverlayColor: string;
  setBrandBackgroundOverlayColor: (value: string) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
};

export function AdminBrandingSection(props: Props) {
  const {
    projectorBackground,
    setProjectorBackground,
    brandBodyBackgroundColor,
    setBrandBodyBackgroundColor,
    voteQuestionTextColor,
    setVoteQuestionTextColor,
    voteOptionTextColor,
    setVoteOptionTextColor,
    voteProgressTrackColor,
    setVoteProgressTrackColor,
    voteProgressBarColor,
    setVoteProgressBarColor,
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
    brandFontFamily,
    setBrandFontFamily,
    setBrandFontUrl,
    availableFonts,
    onUploadFont,
    onUploadFontError,
    brandLogoUrl,
    setBrandLogoUrl,
    brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    onUploadMedia,
    brandBackgroundOverlayColor,
    setBrandBackgroundOverlayColor,
    emitBrandingPatch,
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
          <BrandFontsSection
            brandFontFamily={brandFontFamily}
            setBrandFontFamily={setBrandFontFamily}
            setBrandFontUrl={setBrandFontUrl}
            availableFonts={availableFonts}
            onUploadFont={onUploadFont}
            onUploadFontError={onUploadFontError}
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
            brandBackgroundOverlayColor={brandBackgroundOverlayColor}
            setBrandBackgroundOverlayColor={setBrandBackgroundOverlayColor}
            brandLogoUrl={brandLogoUrl}
            setBrandLogoUrl={setBrandLogoUrl}
            brandPlayerBackgroundImageUrl={brandPlayerBackgroundImageUrl}
            setBrandPlayerBackgroundImageUrl={setBrandPlayerBackgroundImageUrl}
            brandProjectorBackgroundImageUrl={brandProjectorBackgroundImageUrl}
            setBrandProjectorBackgroundImageUrl={setBrandProjectorBackgroundImageUrl}
            onUploadMedia={onUploadMedia}
            onUploadFontError={onUploadFontError}
            emitPatch={emitBrandingPatch}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
