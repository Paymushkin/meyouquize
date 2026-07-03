export type BrandFontFaceDescriptor = {
  weight?: number;
  style?: "normal" | "italic";
  variable?: boolean;
};

export const BUILTIN_BRAND_FONT_FAMILIES = new Set([
  "Jost",
  "Inter",
  "Montserrat",
  "Roboto",
  "Arial",
]);

export function isBuiltinBrandFontFamily(cssFamily: string | undefined): boolean {
  const first =
    (cssFamily ?? "")
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  return BUILTIN_BRAND_FONT_FAMILIES.has(first);
}

/** Кастомные шрифты из глобального каталога (/media/*). Встроенные — через /fonts/* в CSS. */
export function isMediaBrandFontUrl(url: string | undefined): boolean {
  const value = url?.trim() ?? "";
  if (!value) return false;
  if (value.startsWith("/media/")) return true;
  try {
    return new URL(value, "http://localhost").pathname.startsWith("/media/");
  } catch {
    return false;
  }
}

export function inferCssFontFormat(url: string, fileName?: string): string {
  const probe = (fileName?.trim() || url.split("?")[0] || "").toLowerCase();
  if (probe.endsWith(".woff2")) return "woff2";
  if (probe.endsWith(".woff")) return "woff";
  if (probe.endsWith(".otf")) return "opentype";
  if (probe.endsWith(".ttf")) return "truetype";
  return "woff2";
}

export function filterMediaBrandFontUrls(urls: string[] | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((url) => isMediaBrandFontUrl(url));
}

export function inferFontFaceDescriptor(
  fileName: string,
  kind?: "static" | "variable",
): BrandFontFaceDescriptor {
  if (kind === "variable") {
    return { style: "normal", variable: true };
  }
  const base = fileName.replace(/\.[^.]+$/, "");
  const lower = base.toLowerCase();
  const style: "normal" | "italic" = /italic|oblique/i.test(lower) ? "italic" : "normal";
  let weight = 400;
  if (/thin|hairline/i.test(lower)) weight = 100;
  else if (/extralight|ultralight/i.test(lower)) weight = 200;
  else if (/light/i.test(lower)) weight = 300;
  else if (/regular|normal|book/i.test(lower)) weight = 400;
  else if (/medium/i.test(lower)) weight = 500;
  else if (/semibold|demibold/i.test(lower)) weight = 600;
  else if (/bold/i.test(lower)) weight = 700;
  else if (/extrabold|ultrabold/i.test(lower)) weight = 800;
  else if (/black|heavy/i.test(lower)) weight = 900;
  return { weight, style };
}

export function sanitizeBrandFontUrls(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback.length > 0 ? [...fallback] : [];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, 1000);
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= 30) break;
  }
  return out;
}
