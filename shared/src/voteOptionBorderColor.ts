const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

const RGBA_BORDER_RE =
  /^rgba\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(0(?:\.\d+)?|1(?:\.0)?)\s*\)$/i;

export const DEFAULT_VOTE_OPTION_BORDER_COLOR = "rgba(255,255,255,0.4)";

export function isValidVoteOptionBorderColor(value: string): boolean {
  const v = value.trim();
  if (HEX6_RE.test(v)) return true;
  return RGBA_BORDER_RE.test(v);
}

export function sanitizeVoteOptionBorderColor(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim().slice(0, 80);
  if (HEX6_RE.test(v)) return v;
  if (RGBA_BORDER_RE.test(v)) return v;
  return fallback;
}

/** Для `<input type="color">`: hex из rgba или исходный hex. */
export function voteOptionBorderColorToPickerHex(value: string): string {
  const v = value.trim();
  if (HEX6_RE.test(v)) return v;
  const m = v.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(?:0(?:\.\d+)?|1(?:\.0)?)\s*\)$/i,
  );
  if (!m) return "#8a8a8a";
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(Number(m[1]))}${toHex(Number(m[2]))}${toHex(Number(m[3]))}`;
}
