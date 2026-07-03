import type { PublicViewSetPatch } from "../../publicViewContract";

export type AdminFontEntry = {
  id: string;
  family: string;
  url: string;
  kind: "static" | "variable";
  fileName?: string;
};

export type FontFamilyOption = {
  family: string;
  kind: "builtin" | "static" | "variable";
  faceCount: number;
  cssFamily: string;
};

const BUILTIN_FONTS: FontFamilyOption[] = [
  { family: "Jost", kind: "builtin", faceCount: 1, cssFamily: "Jost, Arial, sans-serif" },
  { family: "Inter", kind: "builtin", faceCount: 1, cssFamily: "Inter, Arial, sans-serif" },
  {
    family: "Montserrat",
    kind: "builtin",
    faceCount: 1,
    cssFamily: "Montserrat, Arial, sans-serif",
  },
  { family: "Roboto", kind: "builtin", faceCount: 1, cssFamily: "Roboto, Arial, sans-serif" },
  { family: "Arial", kind: "builtin", faceCount: 1, cssFamily: "Arial, sans-serif" },
];

function looksItalicUrl(url: string): boolean {
  return /italic|oblique/i.test(url);
}

export function groupFontsByFamily(fonts: AdminFontEntry[]): Map<string, AdminFontEntry[]> {
  const map = new Map<string, AdminFontEntry[]>();
  for (const font of fonts) {
    const list = map.get(font.family) ?? [];
    list.push(font);
    map.set(font.family, list);
  }
  return map;
}

export function pickPrimaryFontUrl(family: string, fonts: AdminFontEntry[]): string {
  const familyFonts = fonts.filter((font) => font.family === family);
  const selected =
    familyFonts.find((font) => font.kind === "variable") ??
    familyFonts.find((font) => !looksItalicUrl(font.url)) ??
    familyFonts[0];
  return selected?.url ?? "";
}

export function collectFontUrlsForFamily(family: string, fonts: AdminFontEntry[]): string[] {
  const urls = fonts.filter((font) => font.family === family).map((font) => font.url.trim());
  return [...new Set(urls.filter(Boolean))];
}

export function listFontFamilyOptions(fonts: AdminFontEntry[]): FontFamilyOption[] {
  const grouped = groupFontsByFamily(fonts);
  const custom: FontFamilyOption[] = [];
  for (const [family, faces] of grouped) {
    const variable = faces.some((face) => face.kind === "variable");
    custom.push({
      family,
      kind: variable ? "variable" : "static",
      faceCount: faces.length,
      cssFamily: `"${family}", Arial, sans-serif`,
    });
  }
  custom.sort((a, b) => a.family.localeCompare(b.family, "ru"));
  return [...BUILTIN_FONTS, ...custom];
}

export function buildBrandFontPatchForSelection(
  cssFamily: string,
  fonts: AdminFontEntry[],
): Pick<PublicViewSetPatch, "brandFontFamily" | "brandFontUrl" | "brandFontUrls"> {
  const builtin = BUILTIN_FONTS.find((item) => item.cssFamily === cssFamily);
  if (builtin) {
    return {
      brandFontFamily: cssFamily,
      brandFontUrl: "",
      brandFontUrls: [],
    };
  }
  const familyName =
    cssFamily
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  const urls = collectFontUrlsForFamily(familyName, fonts);
  const primary = pickPrimaryFontUrl(familyName, fonts);
  return {
    brandFontFamily: cssFamily,
    brandFontUrl: primary,
    brandFontUrls: urls,
  };
}

export function familyOptionLabel(option: FontFamilyOption): string {
  if (option.kind === "builtin") return option.family;
  if (option.kind === "variable") return `${option.family} (вариативный)`;
  return `${option.family} (${option.faceCount} начерт.)`;
}
