import type { Theme } from "@mui/material/styles";

/** Строка `font-family` из темы MUI (в т.ч. если задан массивом). */
export function resolveMuiFontFamily(theme: Theme, fallback = "Jost, Arial, sans-serif"): string {
  const f = theme.typography.fontFamily;
  if (f === undefined || f === null) return fallback;
  return Array.isArray(f) ? f.join(", ") : f;
}
