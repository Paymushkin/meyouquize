import { useCallback, useRef, useState } from "react";
import { API_BASE } from "../../config";
import type { EventThemeListOption } from "../../components/admin/branding/EventThemeApplySection";
import { filterCustomEventThemesForApply } from "./filterCustomEventThemesForApply";

type EventThemeApiListItem = EventThemeListOption & { system?: boolean };

export function useEventThemeCatalog() {
  const [customThemes, setCustomThemes] = useState<EventThemeListOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadEventThemes = useCallback(async (options?: { force?: boolean }) => {
    if (loadedRef.current && !options?.force) return;
    setThemesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/event-themes`, {
        credentials: "include",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as EventThemeApiListItem[];
      setCustomThemes(Array.isArray(payload) ? filterCustomEventThemesForApply(payload) : []);
      loadedRef.current = true;
    } finally {
      setThemesLoading(false);
    }
  }, []);

  return { customThemes, themesLoading, loadEventThemes };
}
