import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  buildRoomContentPayload,
  flattenQuestionsFromRoom,
  mergeRoomReloadIntoState,
  serializeRoomContent,
  validateQuestionFormEntry,
  validateQuestionsForm,
  validateSheetsHaveSubQuizId,
  type AdminEventRoom,
  type QuestionForm,
  type SubQuizSheet,
} from "../admin/adminEventForm";
import { API_BASE } from "../config";
import { readCloudManualFromStorage } from "../publicViewContract";
import { socket } from "../socket";
import { parseApiErrorMessage } from "../utils/apiError";

type Params = {
  eventName: string;
  cloudManualStorageKey: string;
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
    cloudManualStorageKey,
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

  const checkSession = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
    setIsAuth(response.ok);
    return response.ok;
  }, [setIsAuth]);

  const loadRoom = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/admin/rooms/${eventName}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const data = (await response.json()) as AdminEventRoom;
    const cloudManual = readCloudManualFromStorage(cloudManualStorageKey);
    const sheets: SubQuizSheet[] = data.subQuizzes.map((s) => ({
      id: s.id,
      title: s.title,
    }));
    setSubQuizSheets(sheets);
    setRoom(data);
    setQuizId(data.id);
    const flat = flattenQuestionsFromRoom(data, cloudManual);
    if (flat[0]?.id) setQuestionId(flat[0].id);
    setQuestionForms(flat);
    lastSavedSnapshotRef.current = serializeRoomContent(sheets, flat);
    setSelectedQuestionIndex(0);
  }, [
    cloudManualStorageKey,
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
      options?: { suppressToast?: boolean; validateOnlyIndex?: number },
    ): Promise<false | { sheets: SubQuizSheet[]; questions: QuestionForm[] }> => {
      const suppressToast = options?.suppressToast ?? false;
      const onlyIdx = options?.validateOnlyIndex;
      const sheetErr = validateSheetsHaveSubQuizId(sheets, questions);
      if (sheetErr) {
        if (!suppressToast) setMessage(sheetErr);
        return false;
      }
      const validationError =
        onlyIdx !== undefined && onlyIdx >= 0 && onlyIdx < questions.length
          ? validateQuestionFormEntry(questions[onlyIdx], onlyIdx)
          : validateQuestionsForm(questions);
      if (validationError) {
        if (!suppressToast) setMessage(validationError);
        return false;
      }
      const snapshot = serializeRoomContent(sheets, questions);
      if (snapshot === lastSavedSnapshotRef.current) {
        return { sheets, questions };
      }
      const payload = buildRoomContentPayload(sheets, questions);
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
        if (!suppressToast) setMessage(errorMessage);
        return false;
      }
      const updatedRoom = (await response.json()) as AdminEventRoom;
      const cloudManual = readCloudManualFromStorage(cloudManualStorageKey);
      const merged = mergeRoomReloadIntoState(updatedRoom, { sheets, questions }, cloudManual);
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
    [
      cloudManualStorageKey,
      eventName,
      lastSavedSnapshotRef,
      setMessage,
      setQuestionForms,
      setRoom,
      setSubQuizSheets,
    ],
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

  const saveQuizTitle = useCallback(
    async (title: string, currentRoomTitle: string | undefined) => {
      const trimmed = title.trim();
      if (!trimmed) {
        setMessage("Название квиза не может быть пустым");
        return;
      }
      if (trimmed === currentRoomTitle) return;
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
      setRoom((prev) => (prev ? { ...prev, title: trimmed } : prev));
      setMessage("Название квиза сохранено");
    },
    [eventName, setMessage, setRoom],
  );

  return {
    checkSession,
    loadRoom,
    persistQuestions,
    patchQuestionProjectorSettings,
    saveQuizTitle,
  };
}
