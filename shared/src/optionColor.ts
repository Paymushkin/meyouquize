const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

export const DEBATE_DEFAULT_OPTION_COLORS = [
  "#1976d2",
  "#c62828",
  "#90a4ae",
  "#2e7d32",
  "#ed6c02",
  "#6a1b9a",
  "#00838f",
  "#ad1457",
] as const;

/** Нормализует hex-цвет варианта (#rrggbb) или возвращает fallback/null. */
export function sanitizeOptionColor(
  value: string | null | undefined,
  fallback: string | null = null,
): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (HEX6_RE.test(trimmed)) return trimmed.toLowerCase();
  if (fallback && HEX6_RE.test(fallback)) return fallback.toLowerCase();
  return null;
}

export function debateDefaultOptionColor(index: number): string {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0;
  return DEBATE_DEFAULT_OPTION_COLORS[safeIndex % DEBATE_DEFAULT_OPTION_COLORS.length]!;
}

/** Контрастный цвет текста на сплошной заливке (#rrggbb). */
export function contrastingTextOnColor(bgHex: string): string {
  const hex = sanitizeOptionColor(bgHex);
  if (!hex) return "#ffffff";
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#111111" : "#ffffff";
}
