import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { API_BASE } from "../../config";
import type { PublicViewSetPatch } from "../../publicViewContract";

type FeedbackFormRow = { id: string; title: string };

type Params = {
  eventName: string;
  isAuth: boolean;
  checkSession: () => Promise<boolean>;
  loadRoom: () => Promise<void>;
  loadFontLibrary: () => Promise<void>;
  setAvailableFeedbackForms: (forms: FeedbackFormRow[]) => void;
  setReportFeedbackFormIds: Dispatch<SetStateAction<string[]>>;
  emitPublicViewPatch: (patch: Pick<PublicViewSetPatch, "reportFeedbackFormIds">) => void;
};

/** Первичная загрузка комнаты/шрифтов и вспомогательных списков — без лишних повторов при смене колбэков. */
export function useAdminEventBootstrap({
  eventName,
  isAuth,
  checkSession,
  loadRoom,
  loadFontLibrary,
  setAvailableFeedbackForms,
  setReportFeedbackFormIds,
  emitPublicViewPatch,
}: Params) {
  const checkSessionRef = useRef(checkSession);
  const loadRoomRef = useRef(loadRoom);
  const loadFontLibraryRef = useRef(loadFontLibrary);
  const emitPublicViewPatchRef = useRef(emitPublicViewPatch);
  checkSessionRef.current = checkSession;
  loadRoomRef.current = loadRoom;
  loadFontLibraryRef.current = loadFontLibrary;
  emitPublicViewPatchRef.current = emitPublicViewPatch;

  useEffect(() => {
    if (!eventName) return;
    let active = true;
    void (async () => {
      const ok = await checkSessionRef.current();
      if (!active || !ok) return;
      await loadRoomRef.current();
      await loadFontLibraryRef.current();
    })();
    return () => {
      active = false;
    };
  }, [eventName]);

  const auxDataKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuth) {
      auxDataKeyRef.current = null;
      return;
    }
    if (!eventName || auxDataKeyRef.current === eventName) return;
    auxDataKeyRef.current = eventName;

    let active = true;
    void (async () => {
      try {
        const feedbackRes = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback`,
          { credentials: "include" },
        );

        if (!active) return;

        if (feedbackRes.ok) {
          const items = (await feedbackRes.json()) as Array<{ id?: string; title?: string }>;
          setAvailableFeedbackForms(
            items
              .filter((item): item is { id: string; title?: string } => typeof item.id === "string")
              .map((item) => ({
                id: item.id,
                title: typeof item.title === "string" ? item.title : "",
              })),
          );
          const formIds = items
            .map((item) => item.id)
            .filter((id): id is string => typeof id === "string");
          setReportFeedbackFormIds((prev) => {
            if (prev.length === 0) return prev;
            const pruned = prev.filter((id) => formIds.includes(id));
            if (pruned.length === prev.length) return prev;
            emitPublicViewPatchRef.current({ reportFeedbackFormIds: pruned });
            return pruned;
          });
        }
      } catch {
        // ignore network errors
      }
    })();

    return () => {
      active = false;
    };
  }, [eventName, isAuth, setAvailableFeedbackForms, setReportFeedbackFormIds]);
}
