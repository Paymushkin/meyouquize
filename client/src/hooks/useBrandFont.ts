import { useEffect, useMemo } from "react";
import {
  filterMediaBrandFontUrls,
  inferCssFontFormat,
  inferFontFaceDescriptor,
  isBuiltinBrandFontFamily,
  isMediaBrandFontUrl,
} from "@meyouquize/shared";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";

function resolveBrandFontAssetUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  return resolveClientAssetUrl(raw);
}

function cssEscapeFamily(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cssEscapeUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildFontFaceCss(
  family: string,
  url: string,
  fileName: string,
  kind?: "static" | "variable",
): string {
  const descriptor = inferFontFaceDescriptor(fileName, kind);
  const weight = descriptor.variable ? "100 900" : String(descriptor.weight ?? 400);
  const style = descriptor.style ?? "normal";
  const safeUrl = cssEscapeUrl(url);
  const format = inferCssFontFormat(url, fileName);
  return `@font-face {
  font-family: "${family}";
  src: url("${safeUrl}") format("${format}");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`;
}

type FontFaceSource = {
  url: string;
  fileName?: string;
  kind?: "static" | "variable";
};

type FontCatalogEntry = {
  family: string;
  url: string;
  fileName?: string;
  kind?: "static" | "variable";
};

export function buildBrandFontFacesForFamily(
  cssFamily: string,
  fontUrls: string[],
  catalog: FontCatalogEntry[],
): FontFaceSource[] {
  const familyName =
    cssFamily
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  const catalogFaces = catalog.filter((font) => font.family === familyName);
  if (catalogFaces.length > 0) {
    return catalogFaces.map((font) => ({
      url: font.url,
      fileName: font.fileName,
      kind: font.kind,
    }));
  }
  return fontUrls.map((url) => ({ url }));
}

export function useBrandFont(
  fontFamily: string,
  fontUrl?: string,
  fontUrls?: string[],
  fontFaces?: FontFaceSource[],
) {
  const resolvedFaces = useMemo((): FontFaceSource[] => {
    if (isBuiltinBrandFontFamily(fontFamily)) return [];
    if (fontFaces?.length) {
      return fontFaces
        .filter((face) => isMediaBrandFontUrl(face.url))
        .map((face) => ({
          ...face,
          url: resolveBrandFontAssetUrl(face.url),
        }))
        .filter((face) => face.url.length > 0);
    }
    const fromArray = filterMediaBrandFontUrls(fontUrls ?? [])
      .map((url) => resolveBrandFontAssetUrl(url))
      .filter((url): url is string => Boolean(url));
    if (fromArray.length > 0) {
      return fromArray.map((url) => ({ url }));
    }
    const single = isMediaBrandFontUrl(fontUrl) ? resolveBrandFontAssetUrl(fontUrl) : "";
    return single ? [{ url: single }] : [];
  }, [fontFaces, fontUrl, fontUrls]);

  useEffect(() => {
    if (!resolvedFaces.length) return;
    const familyCandidate =
      fontFamily
        .split(",")[0]
        ?.trim()
        .replace(/^["']|["']$/g, "") || "Custom Brand Font";
    const family = cssEscapeFamily(familyCandidate.slice(0, 80));
    const styleId = `mq-brand-font-${family}`;
    const css = resolvedFaces
      .map((face, index) =>
        buildFontFaceCss(family, face.url, face.fileName ?? `face-${index}.woff2`, face.kind),
      )
      .join("\n");
    const existing = document.getElementById(styleId) as HTMLStyleElement | null;
    if (existing) {
      if (existing.textContent !== css) {
        existing.textContent = css;
      }
      return;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }, [fontFamily, resolvedFaces]);
}
