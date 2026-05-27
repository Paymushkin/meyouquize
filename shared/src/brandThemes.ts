export type BrandThemeId = "default" | "meyou";

export const DEFAULT_BRAND_THEME_ID: BrandThemeId = "default";

/** Поля оформления, которые переключаются вместе с темой (без баннеров, вопросов и контента плиток). */
export type BrandThemeVisualState = {
  projectorBackground: string;
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  playerVoteOptionTextColor: string;
  playerVoteProgressTrackColor: string;
  playerVoteProgressBarColor: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandFontFamily: string;
  brandFontUrl: string;
  brandLogoUrl: string;
  brandPlayerBackgroundImageUrl: string;
  brandProjectorBackgroundImageUrl: string;
  brandBodyBackgroundColor: string;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
};

const MEYOU_THEME_VISUAL: BrandThemeVisualState = {
  projectorBackground: "#000000",
  voteQuestionTextColor: "#FFFFFF",
  voteOptionTextColor: "#FFFFFF",
  voteProgressTrackColor: "#1A1A1A",
  voteProgressBarColor: "#F3F722",
  playerVoteOptionTextColor: "#ffffff",
  playerVoteProgressTrackColor: "#6a5600",
  playerVoteProgressBarColor: "#F3F722",
  brandPrimaryColor: "#F3F722",
  brandAccentColor: "#F3F722",
  brandSurfaceColor: "#000000",
  brandTextColor: "#FFFFFF",
  brandFontFamily: "Roboto, Arial, sans-serif",
  brandFontUrl: "/fonts/roboto/Roboto-VariableFont_wdth,wght.ttf",
  brandLogoUrl: "/logo.svg",
  brandPlayerBackgroundImageUrl: "/event-bg.png",
  brandProjectorBackgroundImageUrl: "/prj.png",
  brandBodyBackgroundColor: "#000000",
  speakerTileBackgroundColor: "#F3F722",
  speakerTileTextColor: "#000000",
  programTileBackgroundColor: "#FFFFFF",
  programTileTextColor: "#000000",
};

export function sanitizeBrandThemeId(raw: unknown): BrandThemeId {
  return raw === "meyou" ? "meyou" : "default";
}

/** Визуальный пресет темы «как у нового ивента» — значения из DEFAULT_PUBLIC_VIEW_STATE. */
export function getDefaultBrandThemeVisual(): BrandThemeVisualState {
  return {
    projectorBackground: "#7c5acb",
    voteQuestionTextColor: "#1f1f1f",
    voteOptionTextColor: "#1f1f1f",
    voteProgressTrackColor: "#e3e3e3",
    voteProgressBarColor: "#1976d2",
    playerVoteOptionTextColor: "#ffffff",
    playerVoteProgressTrackColor: "#6a5600",
    playerVoteProgressBarColor: "#F3F722",
    brandPrimaryColor: "#7c5acb",
    brandAccentColor: "#1976d2",
    brandSurfaceColor: "#ffffff",
    brandTextColor: "#1f1f1f",
    brandFontFamily: "Jost, Arial, sans-serif",
    brandFontUrl: "",
    brandLogoUrl: "",
    brandPlayerBackgroundImageUrl: "",
    brandProjectorBackgroundImageUrl: "",
    brandBodyBackgroundColor: "#000000",
    speakerTileBackgroundColor: "#1976d2",
    speakerTileTextColor: "#ffffff",
    programTileBackgroundColor: "#6a1b9a",
    programTileTextColor: "#ffffff",
  };
}

export function getMeyouBrandThemeVisual(): BrandThemeVisualState {
  return { ...MEYOU_THEME_VISUAL };
}

export function getBrandThemeVisualPreset(theme: BrandThemeId): BrandThemeVisualState {
  return theme === "meyou" ? getMeyouBrandThemeVisual() : getDefaultBrandThemeVisual();
}

export function getBrandThemeVisualPatch(
  theme: BrandThemeId,
): BrandThemeVisualState & { brandTheme: BrandThemeId } {
  return { brandTheme: theme, ...getBrandThemeVisualPreset(theme) };
}
