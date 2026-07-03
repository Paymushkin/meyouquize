import {
  eventThemeBrandingToPublicViewPatch,
  getBrandThemeVisualPatch,
  type BrandThemeId,
  type EventThemeBranding,
} from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../publicViewContract";
import {
  applyBrandThemeVisualSetters,
  type BrandThemeVisualSetters,
} from "./applyBrandThemeVisual";
import type { EventThemeSelection } from "../../components/admin/branding/EventThemeApplySection";
import type { AdminBrandingTileSetters } from "../admin/applyAdminBrandingVisualFromPublicView";

function presetThemeLabel(theme: BrandThemeId): string {
  return theme === "meyou" ? "MeYOU" : "По умолчанию";
}

export async function applyEventThemeSelection(params: {
  selection: EventThemeSelection;
  apiBase: string;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
  applyFromEventThemeBranding: (branding: EventThemeBranding) => void;
  applyBrandThemeLocally: (theme: BrandThemeId) => void;
  brandThemeVisualSetters: BrandThemeVisualSetters;
  tileBrandSetters: AdminBrandingTileSetters;
  onAppliedName: (name: string | undefined) => void;
}): Promise<void> {
  if (params.selection.kind === "preset") {
    const theme = params.selection.theme;
    const label = presetThemeLabel(theme);
    const patch = getBrandThemeVisualPatch(theme);
    params.applyBrandThemeLocally(theme);
    applyBrandThemeVisualSetters(patch, params.brandThemeVisualSetters);
    params.tileBrandSetters.setSpeakerTileBackgroundColor(patch.speakerTileBackgroundColor);
    params.tileBrandSetters.setSpeakerTileTextColor(patch.speakerTileTextColor);
    params.tileBrandSetters.setProgramTileBackgroundColor(patch.programTileBackgroundColor);
    params.tileBrandSetters.setProgramTileTextColor(patch.programTileTextColor);
    params.emitBrandingPatch({
      ...patch,
      appliedEventThemeName: label,
    });
    params.onAppliedName(label);
    return;
  }

  const response = await fetch(
    `${params.apiBase}/api/admin/event-themes/${encodeURIComponent(params.selection.themeId)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Не удалось загрузить тему");
  }
  const payload = (await response.json()) as { branding: EventThemeBranding };
  const branding = payload.branding;
  params.applyFromEventThemeBranding(branding);
  params.tileBrandSetters.setSpeakerTileBackgroundColor(branding.speakerTileBackgroundColor);
  params.tileBrandSetters.setSpeakerTileTextColor(branding.speakerTileTextColor);
  params.tileBrandSetters.setProgramTileBackgroundColor(branding.programTileBackgroundColor);
  params.tileBrandSetters.setProgramTileTextColor(branding.programTileTextColor);
  params.emitBrandingPatch(
    eventThemeBrandingToPublicViewPatch(branding, params.selection.themeName),
  );
  params.onAppliedName(params.selection.themeName);
}
