export type AdminColorMode = "light" | "dark";

export const ADMIN_COLOR_MODE_STORAGE_KEY = "mq_admin_color_mode";

export function isAdminColorMode(value: unknown): value is AdminColorMode {
  return value === "light" || value === "dark";
}

export function readStoredAdminColorMode(): AdminColorMode {
  try {
    const raw = window.localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY);
    if (isAdminColorMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function writeStoredAdminColorMode(mode: AdminColorMode): void {
  try {
    window.localStorage.setItem(ADMIN_COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
