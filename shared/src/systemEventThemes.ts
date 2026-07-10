import type { BrandThemeId } from "./brandThemes.js";

export const SYSTEM_EVENT_THEME_IDS = ["default", "meyou"] as const;

export type SystemEventThemeId = (typeof SYSTEM_EVENT_THEME_IDS)[number];

export function isSystemEventThemeId(id: string): id is SystemEventThemeId {
  return id === "default" || id === "meyou";
}

export function systemEventThemeDisplayName(id: SystemEventThemeId): string {
  return id === "meyou" ? "MeYOU" : "По умолчанию";
}

export function systemEventThemeStorageName(id: SystemEventThemeId): string {
  return `__system__:${id}`;
}

export function brandThemeIdFromSystemEventThemeId(id: SystemEventThemeId): BrandThemeId {
  return id;
}
