import type { BrandThemeId } from "./brandThemes.js";

export type ProjectorJoinQrOverlayCorner =
  | "top_right"
  | "top_left"
  | "bottom_right"
  | "bottom_left";

/** Полный набор полей брендинга для сохранённой темы ивента. */
export type EventThemeBranding = {
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  cloudCorrectTagColor: string;
  cloudDensity: number;
  cloudTagPadding: number;
  cloudSpiral: "archimedean" | "rectangular";
  cloudAnimationStrength: number;
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteOptionBorderColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  playerVoteOptionTextColor: string;
  playerVoteProgressTrackColor: string;
  playerVoteProgressBarColor: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandInputTextColor: string;
  brandFontFamily: string;
  brandFontUrl: string;
  brandFontUrls?: string[];
  brandLogoUrl: string;
  brandPlayerBackgroundImageUrl: string;
  brandProjectorBackgroundImageUrl: string;
  brandBodyBackgroundColor: string;
  brandTheme: BrandThemeId;
  projectorJoinQrVisible: boolean;
  projectorJoinQrOverlayVisible: boolean;
  projectorJoinQrText: string;
  projectorJoinQrTextColor: string;
  projectorJoinQrOverlaySizePx: number;
  projectorJoinQrOverlayInsetVerticalPx: number;
  projectorJoinQrOverlayInsetHorizontalPx: number;
  projectorJoinQrOverlayInsetPx: number;
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
};

export type EventThemeBrandingPatch = EventThemeBranding & {
  appliedEventThemeName?: string;
  appliedEventThemeKey?: string;
};

type PublicViewLike = Record<string, unknown>;

export function pickEventThemeBrandingFromPublicView(view: unknown): EventThemeBranding {
  const value = (
    view && typeof view === "object" && !Array.isArray(view) ? view : {}
  ) as PublicViewLike;
  return {
    projectorBackground: String(value.projectorBackground ?? ""),
    cloudQuestionColor: String(value.cloudQuestionColor ?? ""),
    cloudTagColors: Array.isArray(value.cloudTagColors)
      ? value.cloudTagColors.filter((item): item is string => typeof item === "string")
      : [],
    cloudTopTagColor: String(value.cloudTopTagColor ?? ""),
    cloudCorrectTagColor: String(value.cloudCorrectTagColor ?? ""),
    cloudDensity: Number(value.cloudDensity ?? 0),
    cloudTagPadding: Number(value.cloudTagPadding ?? 0),
    cloudSpiral: value.cloudSpiral === "rectangular" ? "rectangular" : "archimedean",
    cloudAnimationStrength: Number(value.cloudAnimationStrength ?? 0),
    voteQuestionTextColor: String(value.voteQuestionTextColor ?? ""),
    voteOptionTextColor: String(value.voteOptionTextColor ?? ""),
    voteOptionBorderColor: String(value.voteOptionBorderColor ?? ""),
    voteProgressTrackColor: String(value.voteProgressTrackColor ?? ""),
    voteProgressBarColor: String(value.voteProgressBarColor ?? ""),
    playerVoteOptionTextColor: String(value.playerVoteOptionTextColor ?? ""),
    playerVoteProgressTrackColor: String(value.playerVoteProgressTrackColor ?? ""),
    playerVoteProgressBarColor: String(value.playerVoteProgressBarColor ?? ""),
    brandPrimaryColor: String(value.brandPrimaryColor ?? ""),
    brandAccentColor: String(value.brandAccentColor ?? ""),
    brandSurfaceColor: String(value.brandSurfaceColor ?? ""),
    brandTextColor: String(value.brandTextColor ?? ""),
    brandInputTextColor: String(value.brandInputTextColor ?? ""),
    brandFontFamily: String(value.brandFontFamily ?? ""),
    brandFontUrl: String(value.brandFontUrl ?? ""),
    brandFontUrls: Array.isArray(value.brandFontUrls)
      ? value.brandFontUrls.filter((item): item is string => typeof item === "string")
      : [],
    brandLogoUrl: String(value.brandLogoUrl ?? ""),
    brandPlayerBackgroundImageUrl: String(value.brandPlayerBackgroundImageUrl ?? ""),
    brandProjectorBackgroundImageUrl: String(value.brandProjectorBackgroundImageUrl ?? ""),
    brandBodyBackgroundColor: String(value.brandBodyBackgroundColor ?? ""),
    brandTheme: value.brandTheme === "meyou" ? "meyou" : "default",
    projectorJoinQrVisible: Boolean(value.projectorJoinQrVisible),
    projectorJoinQrOverlayVisible:
      typeof value.projectorJoinQrOverlayVisible === "boolean"
        ? value.projectorJoinQrOverlayVisible
        : Boolean(value.projectorJoinQrVisible),
    projectorJoinQrText: String(value.projectorJoinQrText ?? ""),
    projectorJoinQrTextColor: String(value.projectorJoinQrTextColor ?? ""),
    projectorJoinQrOverlaySizePx: Number(value.projectorJoinQrOverlaySizePx ?? 0),
    projectorJoinQrOverlayInsetVerticalPx: Number(
      value.projectorJoinQrOverlayInsetVerticalPx ?? value.projectorJoinQrOverlayInsetPx ?? 0,
    ),
    projectorJoinQrOverlayInsetHorizontalPx: Number(
      value.projectorJoinQrOverlayInsetHorizontalPx ?? value.projectorJoinQrOverlayInsetPx ?? 0,
    ),
    projectorJoinQrOverlayInsetPx: Number(value.projectorJoinQrOverlayInsetPx ?? 0),
    projectorJoinQrOverlayCorner:
      value.projectorJoinQrOverlayCorner === "top_left" ||
      value.projectorJoinQrOverlayCorner === "bottom_right" ||
      value.projectorJoinQrOverlayCorner === "bottom_left"
        ? value.projectorJoinQrOverlayCorner
        : "top_right",
    speakerTileBackgroundColor: String(value.speakerTileBackgroundColor ?? ""),
    speakerTileTextColor: String(value.speakerTileTextColor ?? ""),
    programTileBackgroundColor: String(value.programTileBackgroundColor ?? ""),
    programTileTextColor: String(value.programTileTextColor ?? ""),
  };
}

export function sanitizeAppliedEventThemeKey(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed === "default" || trimmed === "meyou") return trimmed;
  if (/^custom:[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed.slice(0, 140);
  return undefined;
}

export function eventThemeBrandingToPublicViewPatch(
  branding: EventThemeBranding,
  appliedEventThemeName?: string,
  appliedEventThemeKey?: string,
): EventThemeBrandingPatch {
  return {
    ...branding,
    ...(appliedEventThemeName?.trim()
      ? { appliedEventThemeName: appliedEventThemeName.trim().slice(0, 120) }
      : {}),
    ...(sanitizeAppliedEventThemeKey(appliedEventThemeKey)
      ? { appliedEventThemeKey: sanitizeAppliedEventThemeKey(appliedEventThemeKey) }
      : {}),
  };
}
