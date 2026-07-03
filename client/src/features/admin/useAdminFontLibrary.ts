import { useCallback, useRef, useState } from "react";
import { API_BASE } from "../../config";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

export type AdminFontEntry = {
  id: string;
  family: string;
  url: string;
  kind: "static" | "variable";
  fileName?: string;
};

export function useAdminFontLibrary() {
  const [availableFonts, setAvailableFonts] = useState<AdminFontEntry[]>([]);
  const loadedRef = useRef(false);

  const loadFontLibrary = useCallback(async (options?: { force?: boolean }) => {
    if (loadedRef.current && !options?.force) return;
    const response = await fetch(`${API_BASE}/api/admin/fonts`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      fonts?: Array<{
        id: string;
        family: string;
        url: string;
        kind?: "static" | "variable";
        fileName?: string;
      }>;
    };
    setAvailableFonts(
      Array.isArray(payload.fonts)
        ? payload.fonts.map((font) => ({
            ...font,
            url: resolveClientAssetUrl(font.url),
            kind: font.kind === "variable" ? "variable" : "static",
            fileName: font.fileName,
          }))
        : [],
    );
    loadedRef.current = true;
  }, []);

  return { availableFonts, setAvailableFonts, loadFontLibrary };
}
