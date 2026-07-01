import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  buildRoomContentPayload,
  flattenQuestionsFromRoom,
  mergeRoomReloadIntoState,
  normalizeTagCloudQuestionPoints,
  serializeRoomContent,
  validateQuestionsForm,
  validateSheetsHaveSubQuizId,
  type AdminEventRoom,
  type QuestionForm,
  type SubQuizSheet,
} from "../admin/adminEventForm";
import { API_BASE } from "../config";
import { readCloudManualFromPublicView } from "../features/tagCloudAdmin";
import type { CloudManualStateByQuestion } from "../publicViewContract";
import { socket } from "../socket";
import { parseApiErrorMessage } from "../utils/apiError";

const TAG_CLOUD_MANUAL_DEBOUNCE_MS = 400;

type Params = {
  eventName: string;
  lastSavedSnapshotRef: MutableRefObject<string>;
  setIsAuth: (value: boolean) => void;
  setRoom: Dispatch<SetStateAction<AdminEventRoom | null>>;
  setQuizId: (value: string) => void;
  setQuestionId: (value: string) => void;
  setSubQuizSheets: Dispatch<SetStateAction<SubQuizSheet[]>>;
  setQuestionForms: Dispatch<SetStateAction<QuestionForm[]>>;
  setSelectedQuestionIndex: (value: number) => void;
  setMessage: (value: string) => void;
};

export function useAdminEventApi(params: Params) {
  const {
    eventName,
    lastSavedSnapshotRef,
    setIsAuth,
    setRoom,
    setQuizId,
    setQuestionId,
    setSubQuizSheets,
    setQuestionForms,
    setSelectedQuestionIndex,
    setMessage,
  } = params;

  const lastPersistQuestionsErrorRef = useRef<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const readSubQuizTitleFromSnapshot = useCallback((snapshot: string, subQuizId: string) => {
    try {
      const parsed = JSON.parse(snapshot) as {
        subQuizzes?: Array<{ id?: string; title?: string }>;
      };
      const hit = parsed.subQuizzes?.find((s) => s.id === subQuizId);
      return (hit?.title ?? "").trim();
    } catch {
      return "";
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
      setIsAuth(response.ok);
      return response.ok;
    } catch {
      setIsAuth(false);
      return false;
    } finally {
      setAuthChecked(true);
    }
  }, [setIsAuth]);

  const loadRoomInFlightRef = useRef<Promise<void> | null>(null);

  const loadRoom = useCallback(async () => {
    if (loadRoomInFlightRef.current) {
      return loadRoomInFlightRef.current;
    }
    const promise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/admin/rooms/${eventName}`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const data = (await response.json()) as AdminEventRoom;
        const cloudManual = readCloudManualFromPublicView(data.publicView);
        const sheets: SubQuizSheet[] = data.subQuizzes.map((s) => ({
          id: s.id,
          title: s.title,
          questionFlowMode: s.questionFlowMode === "AUTO" ? "auto" : "manual",
        }));
        setSubQuizSheets(sheets);
        setRoom(data);
        setQuizId(data.id);
        const flat = flattenQuestionsFromRoom(data, cloudManual);
        if (flat[0]?.id) setQuestionId(flat[0].id);
        setQuestionForms(flat);
        lastSavedSnapshotRef.current = serializeRoomContent(sheets, flat);
        setSelectedQuestionIndex(0);
      } finally {
        loadRoomInFlightRef.current = null;
      }
    })();
    loadRoomInFlightRef.current = promise;
    return promise;
  }, [
    eventName,
    lastSavedSnapshotRef,
    setQuestionForms,
    setQuestionId,
    setQuizId,
    setRoom,
    setSelectedQuestionIndex,
    setSubQuizSheets,
  ]);

  const persistQuestions = useCallback(
    async (
      questions: QuestionForm[],
      sheets: SubQuizSheet[],
      options?: { suppressToast?: boolean },
    ): Promise<false | { sheets: SubQuizSheet[]; questions: QuestionForm[] }> => {
      const suppressToast = options?.suppressToast ?? false;
      const normalizedQuestions = questions.map((q) =>
        q.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(q) : q,
      );
      const sheetErr = validateSheetsHaveSubQuizId(sheets, normalizedQuestions);
      if (sheetErr) {
        lastPersistQuestionsErrorRef.current = sheetErr;
        if (!suppressToast) setMessage(sheetErr);
        return false;
      }
      const validationError = validateQuestionsForm(normalizedQuestions);
      if (validationError) {
        lastPersistQuestionsErrorRef.current = validationError;
        if (!suppressToast) setMessage(validationError);
        return false;
      }
      const snapshot = serializeRoomContent(sheets, normalizedQuestions);
      if (snapshot === lastSavedSnapshotRef.current) {
        lastPersistQuestionsErrorRef.current = null;
        return { sheets, questions: normalizedQuestions };
      }
      const payload = buildRoomContentPayload(sheets, normalizedQuestions);
      const response = await fetch(`${API_BASE}/api/admin/rooms/${eventName}/questions`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let errorMessage = "Не удалось сохранить вопросы";
        try {
          const payload = await response.json();
          errorMessage = parseApiErrorMessage(payload, errorMessage);
        } catch {
          // ignore json parse issues and keep fallback message
        }
        lastPersistQuestionsErrorRef.current = errorMessage;
        if (!suppressToast) setMessage(errorMessage);
        return false;
      }
      lastPersistQuestionsErrorRef.current = null;
      const updatedRoom = (await response.json()) as AdminEventRoom;
      const cloudManual = readCloudManualFromPublicView(updatedRoom.publicView);
      const merged = mergeRoomReloadIntoState(
        updatedRoom,
        { sheets, questions: normalizedQuestions },
        cloudManual,
      );
      setSubQuizSheets(merged.sheets);
      setQuestionForms(merged.questions);
      setRoom(updatedRoom);
      lastSavedSnapshotRef.current = serializeRoomContent(merged.sheets, merged.questions);
      if (updatedRoom.id) {
        socket.emit("quiz:state:refresh", { quizId: updatedRoom.id });
      }
      if (!suppressToast) setMessage("");
      return merged;
    },
    [eventName, lastSavedSnapshotRef, setMessage, setQuestionForms, setRoom, setSubQuizSheets],
  );

  /** Частичный PATCH настроек проектора (в т.ч. метрика ранжирования) — без PUT replace (ответы не удаляются). */
  const patchQuestionProjectorSettings = useCallback(
    async (
      questionId: string,
      body: {
        projectorShowFirstCorrect?: boolean;
        projectorFirstCorrectWinnersCount?: number;
        rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
      },
      sheets: SubQuizSheet[],
      questions: QuestionForm[],
      quizIdForRefresh?: string | null,
    ) => {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/questions/${encodeURIComponent(questionId)}/projector-settings`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        setMessage("Не удалось сохранить настройки проектора для вопроса");
        return false;
      }
      lastSavedSnapshotRef.current = serializeRoomContent(sheets, questions);
      setMessage("");
      if (quizIdForRefresh) {
        socket.emit("quiz:state:refresh", { quizId: quizIdForRefresh });
      }
      return true;
    },
    [eventName, lastSavedSnapshotRef, setMessage],
  );

  const patchQuestionAdminDone = useCallback(
    async (
      questionId: string,
      adminDone: boolean,
      sheets: SubQuizSheet[],
      questions: QuestionForm[],
      quizIdForRefresh?: string | null,
    ) => {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/questions/${encodeURIComponent(questionId)}/admin-done`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ adminDone }),
        },
      );
      if (!response.ok) {
        setMessage("Не удалось обновить статус «отработано»");
        return false;
      }
      lastSavedSnapshotRef.current = serializeRoomContent(sheets, questions);
      setMessage("");
      if (quizIdForRefresh) {
        socket.emit("quiz:state:refresh", { quizId: quizIdForRefresh });
      }
      return true;
    },
    [eventName, lastSavedSnapshotRef, setMessage],
  );

  const saveSubQuizTitle = useCallback(
    async (
      subQuizId: string,
      title: string,
      sheets: SubQuizSheet[],
      questions: QuestionForm[],
      quizIdForRefresh?: string | null,
    ) => {
      const trimmed = title.trim();
      const savedTitle = readSubQuizTitleFromSnapshot(lastSavedSnapshotRef.current, subQuizId);
      if (trimmed === savedTitle) return;
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/sub-quizzes/${encodeURIComponent(subQuizId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        },
      );
      if (!response.ok) {
        setMessage("Не удалось сохранить название квиза");
        return;
      }
      const payload = (await response.json()) as { quizId?: string };
      const nextSheets = sheets.map((s) => (s.id === subQuizId ? { ...s, title: trimmed } : s));
      setSubQuizSheets(nextSheets);
      lastSavedSnapshotRef.current = serializeRoomContent(nextSheets, questions);
      const refreshId = payload.quizId ?? quizIdForRefresh;
      if (refreshId) {
        socket.emit("quiz:state:refresh", { quizId: refreshId });
      }
    },
    [eventName, lastSavedSnapshotRef, readSubQuizTitleFromSnapshot, setMessage, setSubQuizSheets],
  );

  const saveQuizTitle = useCallback(
    async (
      title: string,
      currentRoomTitle: string | undefined,
      quizIdForRefresh?: string | null,
    ) => {
      const trimmed = title.trim();
      const currentTrimmed = (currentRoomTitle ?? "").trim();
      if (trimmed === currentTrimmed) return;
      const response = await fetch(`${API_BASE}/api/admin/rooms/${eventName}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) {
        setMessage("Не удалось сохранить название квиза");
        return;
      }
      const updatedRoom = (await response.json()) as AdminEventRoom;
      setRoom((prev) => (prev ? { ...prev, title: trimmed } : prev));
      const refreshId = updatedRoom.id ?? quizIdForRefresh;
      if (refreshId) {
        socket.emit("quiz:state:refresh", { quizId: refreshId });
      }
      setMessage("Название квиза сохранено");
    },
    [eventName, setMessage, setRoom],
  );

  const persistTagCloudManual = useCallback(
    async (manual: CloudManualStateByQuestion): Promise<boolean> => {
      if (Object.keys(manual).length === 0) return true;
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/tag-cloud-manual`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tagCloudManualByQuestionId: manual }),
          },
        );
        if (!response.ok) {
          setMessage("Не удалось сохранить ручные теги облака");
          return false;
        }
        const updatedRoom = (await response.json()) as AdminEventRoom;
        setRoom(updatedRoom);
        return true;
      } catch {
        setMessage("Не удалось сохранить ручные теги облака");
        return false;
      }
    },
    [eventName, setMessage, setRoom],
  );

  const pendingManualRef = useRef<CloudManualStateByQuestion | null>(null);
  const manualDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualPersistWaitersRef = useRef<Array<(ok: boolean) => void>>([]);

  const flushPendingTagCloudManual = useCallback(async (): Promise<boolean> => {
    const manual = pendingManualRef.current;
    pendingManualRef.current = null;
    if (!manual) {
      const waiters = manualPersistWaitersRef.current;
      manualPersistWaitersRef.current = [];
      waiters.forEach((resolve) => resolve(true));
      return true;
    }
    const ok = await persistTagCloudManual(manual);
    const waiters = manualPersistWaitersRef.current;
    manualPersistWaitersRef.current = [];
    waiters.forEach((resolve) => resolve(ok));
    return ok;
  }, [persistTagCloudManual]);

  const schedulePersistTagCloudManual = useCallback(
    (manual: CloudManualStateByQuestion): Promise<boolean> => {
      if (Object.keys(manual).length === 0) return Promise.resolve(true);
      pendingManualRef.current = manual;
      return new Promise((resolve) => {
        manualPersistWaitersRef.current.push(resolve);
        if (manualDebounceTimerRef.current) {
          clearTimeout(manualDebounceTimerRef.current);
        }
        manualDebounceTimerRef.current = setTimeout(() => {
          manualDebounceTimerRef.current = null;
          void flushPendingTagCloudManual();
        }, TAG_CLOUD_MANUAL_DEBOUNCE_MS);
      });
    },
    [flushPendingTagCloudManual],
  );

  useEffect(() => {
    return () => {
      if (manualDebounceTimerRef.current) {
        clearTimeout(manualDebounceTimerRef.current);
        manualDebounceTimerRef.current = null;
      }
      if (pendingManualRef.current) {
        void flushPendingTagCloudManual();
      }
    };
  }, [flushPendingTagCloudManual]);

  return {
    authChecked,
    checkSession,
    loadRoom,
    persistQuestions,
    persistTagCloudManual: schedulePersistTagCloudManual,
    lastPersistQuestionsErrorRef,
    patchQuestionProjectorSettings,
    patchQuestionAdminDone,
    saveSubQuizTitle,
    saveQuizTitle,
  };
}
