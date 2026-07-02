import type { PublicViewSetPatch } from "../../publicViewContract";
import type { FeedbackFormConfig } from "../../types/feedback";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { API_BASE } from "../../config";

type FeedbackFormRow = { id: string; title: string };

type Params = {
  eventName: string;
  isAuth: boolean;
  setAvailableFeedbackForms: (forms: FeedbackFormRow[]) => void;
  setReportFeedbackFormIds: Dispatch<SetStateAction<string[]>>;
  emitPublicViewPatch: (patch: Pick<PublicViewSetPatch, "reportFeedbackFormIds">) => void;
};

function syncCatalogToReportState(
  items: FeedbackFormConfig[],
  setAvailableFeedbackForms: (forms: FeedbackFormRow[]) => void,
  setReportFeedbackFormIds: Dispatch<SetStateAction<string[]>>,
  emitPublicViewPatch: (patch: Pick<PublicViewSetPatch, "reportFeedbackFormIds">) => void,
) {
  setAvailableFeedbackForms(
    items.map((item) => ({
      id: item.id,
      title: typeof item.title === "string" ? item.title : "",
    })),
  );
  const formIds = items.map((item) => item.id);
  setReportFeedbackFormIds((prev) => {
    if (prev.length === 0) return prev;
    const pruned = prev.filter((id) => formIds.includes(id));
    if (pruned.length === prev.length) return prev;
    emitPublicViewPatch({ reportFeedbackFormIds: pruned });
    return pruned;
  });
}

/** Каталог форм обратной связи — грузится по требованию (отчёт / вкладка feedback). */
export function useAdminFeedbackCatalog({
  eventName,
  isAuth,
  setAvailableFeedbackForms,
  setReportFeedbackFormIds,
  emitPublicViewPatch,
}: Params) {
  const [feedbackForms, setFeedbackForms] = useState<FeedbackFormConfig[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const loadedEventRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const emitPublicViewPatchRef = useRef(emitPublicViewPatch);
  emitPublicViewPatchRef.current = emitPublicViewPatch;

  const syncCatalogToReport = useCallback(
    (items: FeedbackFormConfig[]) => {
      syncCatalogToReportState(
        items,
        setAvailableFeedbackForms,
        setReportFeedbackFormIds,
        (patch) => emitPublicViewPatchRef.current(patch),
      );
    },
    [setAvailableFeedbackForms, setReportFeedbackFormIds],
  );

  const loadCatalog = useCallback(
    async (force = false) => {
      if (!eventName || !isAuth) return;
      if (!force && loadedEventRef.current === eventName) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setCatalogLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback`,
          { credentials: "include" },
        );
        if (!response.ok) return;

        const items = (await response.json()) as FeedbackFormConfig[];
        setFeedbackForms(items);
        syncCatalogToReport(items);
        loadedEventRef.current = eventName;
      } catch {
        // ignore network errors
      } finally {
        inFlightRef.current = false;
        setCatalogLoading(false);
      }
    },
    [eventName, isAuth, syncCatalogToReport],
  );

  const ensureCatalogLoaded = useCallback(() => loadCatalog(false), [loadCatalog]);
  const reloadCatalog = useCallback(() => loadCatalog(true), [loadCatalog]);

  useEffect(() => {
    if (!isAuth) {
      setFeedbackForms([]);
      loadedEventRef.current = null;
      return;
    }
    if (loadedEventRef.current !== null && loadedEventRef.current !== eventName) {
      setFeedbackForms([]);
      loadedEventRef.current = null;
    }
  }, [eventName, isAuth]);

  return {
    feedbackForms,
    setFeedbackForms,
    catalogLoading,
    ensureCatalogLoaded,
    reloadCatalog,
    syncCatalogToReport,
  };
}
