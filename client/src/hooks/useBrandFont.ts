import { useEffect } from "react";
import { sanitizeClientAssetUrl } from "../utils/safeUrls";

function cssEscapeFamily(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function useBrandFont(fontFamily: string, fontUrl?: string) {
  useEffect(() => {
    const url = sanitizeClientAssetUrl(fontUrl);
    if (!url) return;
    const familyCandidate =
      fontFamily
        .split(",")[0]
        ?.trim()
        .replace(/^["']|["']$/g, "") || "Custom Brand Font";
    const family = cssEscapeFamily(familyCandidate.slice(0, 80));
    const styleId = `mq-brand-font-${family}`;
    const css = `
@font-face {
  font-family: "${family}";
  src: url("${url}") format("woff2"),
       url("${url}") format("woff"),
       url("${url}") format("opentype"),
       url("${url}") format("truetype");
  font-style: normal;
  font-display: swap;
}`;
    const existing = document.getElementById(styleId) as HTMLStyleElement | null;
    if (existing) {
      if (existing.textContent !== css) {
        existing.textContent = css;
        existing.setAttribute("data-font-url", url);
      }
      return;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    style.setAttribute("data-font-url", url);
    document.head.appendChild(style);
    return () => {
      // Keep once registered to avoid flicker across route changes.
    };
  }, [fontFamily, fontUrl]);
}
