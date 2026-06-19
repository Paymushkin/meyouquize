/** Совпадает с темой админки: palette.primary / background.default */
export const ADMIN_DEFAULT_PROJECTOR_BACKGROUND = "#7c5acb";

export function isAdminDefaultProjectorBackground(hex: string): boolean {
  const a = hex.trim().replace("#", "").toLowerCase();
  const b = ADMIN_DEFAULT_PROJECTOR_BACKGROUND.replace("#", "").toLowerCase();
  return a === b;
}
