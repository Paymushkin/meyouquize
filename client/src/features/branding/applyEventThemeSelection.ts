import { eventThemeBrandingToPublicViewPatch, type EventThemeBranding } from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../publicViewContract";
import type { EventThemeSelection } from "../../components/admin/branding/EventThemeApplySection";
import { eventThemeSelectionToKey } from "../../components/admin/branding/EventThemeApplySection";
import type { AdminBrandingTileSetters } from "../admin/applyAdminBrandingVisualFromPublicView";

function presetThemeLabel(theme: "default" | "meyou"): string {
  return theme === "meyou" ? "MeYOU" : "По умолчанию";
}

export async function applyEventThemeSelection(params: {
  selection: EventThemeSelection;
  apiBase: string;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
  applyFromEventThemeBranding: (branding: EventThemeBranding) => void;
  applyBrandThemeLocally: (theme: EventThemeBranding["brandTheme"]) => void;
  tileBrandSetters: AdminBrandingTileSetters;
  onAppliedName: (name: string | undefined) => void;
  onAppliedKey?: (key: string | undefined) => void;
}): Promise<void> {
  if (params.selection.kind === "preset") {
    const theme = params.selection.theme;
    const label = presetThemeLabel(theme);
    const response = await fetch(
      `${params.apiBase}/api/admin/event-themes/${encodeURIComponent(theme)}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Не удалось загрузить тему");
    }
    const payload = (await response.json()) as { branding: EventThemeBranding };
    const branding = payload.branding;
    params.applyFromEventThemeBranding(branding);
    params.applyBrandThemeLocally(branding.brandTheme);
    params.tileBrandSetters.setSpeakerTileBackgroundColor(branding.speakerTileBackgroundColor);
    params.tileBrandSetters.setSpeakerTileTextColor(branding.speakerTileTextColor);
    params.tileBrandSetters.setProgramTileBackgroundColor(branding.programTileBackgroundColor);
    params.tileBrandSetters.setProgramTileTextColor(branding.programTileTextColor);
    const key = eventThemeSelectionToKey(params.selection);
    params.emitBrandingPatch(eventThemeBrandingToPublicViewPatch(branding, label, key));
    params.onAppliedName(label);
    params.onAppliedKey?.(key);
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
    eventThemeBrandingToPublicViewPatch(
      branding,
      params.selection.themeName,
      eventThemeSelectionToKey(params.selection),
    ),
  );
  params.onAppliedName(params.selection.themeName);
  params.onAppliedKey?.(eventThemeSelectionToKey(params.selection));
}
