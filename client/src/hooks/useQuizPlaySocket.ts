import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { socket } from "../socket";
import type { QuizState } from "../pages/quiz-play/types";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import { parseSocketErrorCode, parseSocketErrorMessage } from "../utils/socketError";

type Params = {
  activeQuestionIdRef: MutableRefObject<string | null>;
  activeQuestionTypeRef: MutableRefObject<"single" | "multi" | "tag_cloud" | "ranking" | null>;
  selectedRef: MutableRefObject<string[]>;
  rankOrderRef: MutableRefObject<string[]>;
  tagAnswersRef: MutableRefObject<string[]>;
  setQuiz: Dispatch<SetStateAction<QuizState | null>>;
  setSelected: Dispatch<SetStateAction<string[]>>;
  setRankOrder: Dispatch<SetStateAction<string[]>>;
  setTagAnswers: Dispatch<SetStateAction<string[]>>;
  setSubmittedAnswers: Dispatch<SetStateAction<Record<string, string[]>>>;
  setSubmittedQuestionIds: Dispatch<SetStateAction<string[]>>;
  setPlayerAnswersHydrated: Dispatch<SetStateAction<boolean>>;
  onQuestionSubmitted?: (questionId: string) => void;
  setError: Dispatch<SetStateAction<string>>;
  setJoined: Dispatch<SetStateAction<boolean>>;
  setConnectionStatus: Dispatch<SetStateAction<"online" | "reconnecting" | "offline">>;
  setSpeakerQuestions: Dispatch<SetStateAction<SpeakerQuestionsPayload | null>>;
  onParticipantMissing?: () => void;
  onQuizJoined?: () => void;
};

export function useQuizPlaySocket({
  activeQuestionIdRef,
  activeQuestionTypeRef,
  selectedRef,
  rankOrderRef,
  tagAnswersRef,
  setQuiz,
  setSelected,
  setRankOrder,
  setTagAnswers,
  setSubmittedAnswers,
  setSubmittedQuestionIds,
  setPlayerAnswersHydrated,
  onQuestionSubmitted,
  setError,
  setJoined,
  setConnectionStatus,
  setSpeakerQuestions,
  onParticipantMissing,
  onQuizJoined,
}: Params) {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const getCurrentSelection = () => {
      if (activeQuestionTypeRef.current === "tag_cloud") {
        return tagAnswersRef.current.map((value) => value.trim()).filter(Boolean);
      }
      if (activeQuestionTypeRef.current === "ranking") {
        return rankOrderRef.current;
      }
      return selectedRef.current;
    };
    const clearCurrentInputs = () => {
      setSelected([]);
      setRankOrder([]);
    };
    const clearAllInputs = () => {
      clearCurrentInputs();
      setTagAnswers([""]);
    };
    const hydrateSubmittedAnswers = (answers: Record<string, string[]>) => {
      setSubmittedAnswers(answers);
      setSubmittedQuestionIds(Object.keys(answers));
      setPlayerAnswersHydrated(true);
    };
    const onState = (state: QuizState) => {
      const prevQuestionId = activeQuestionIdRef.current;
      const prevQuestionType = activeQuestionTypeRef.current;
      const nextQuestionId = state.activeQuestion?.id ?? null;
      const nextQuestionType = state.activeQuestion?.type ?? null;
      setQuiz(state);
      if (prevQuestionId !== nextQuestionId || prevQuestionType !== nextQuestionType) {
        clearAllInputs();
      }
    };
    const onError = (evt: unknown) => {
      const message = parseSocketErrorMessage(evt);
      const code = parseSocketErrorCode(evt);
      if (code === "ALREADY_ANSWERED" || message === "Already answered this question") {
        const activeQuestionId = activeQuestionIdRef.current;
        if (activeQuestionId) {
          setSubmittedQuestionIds((prev) =>
            prev.includes(activeQuestionId) ? prev : [...prev, activeQuestionId],
          );
        }
        return;
      }
      if (message === "Participant not found" || code === "NOT_JOINED") {
        onParticipantMissing?.();
        setError("");
        return;
      }
      setError(message);
    };
    const onConnectError = () => {
      setConnectionStatus("reconnecting");
      setError(
        "Нет соединения с сервером квиза. Проверьте, что backend доступен в вашей Wi-Fi сети.",
      );
    };
    const onConnect = () => {
      setConnectionStatus("online");
      setError("");
    };
    const onDisconnect = () => {
      setConnectionStatus("offline");
    };
    const onJoined = () => {
      setJoined(true);
      onQuizJoined?.();
    };
    const onPlayerAnswers = (answers: Record<string, string[]>) => {
      hydrateSubmittedAnswers(answers);
    };
    const onAnswersReset = () => {
      hydrateSubmittedAnswers({});
      clearCurrentInputs();
      setError("");
    };
    const onAnswersCleared = (payload: { all?: boolean; questionId?: string }) => {
      if (payload.all) {
        hydrateSubmittedAnswers({});
        clearCurrentInputs();
        return;
      }
      if (payload.questionId) {
        setSubmittedAnswers((prev) => {
          const next = { ...prev };
          delete next[payload.questionId!];
          return next;
        });
        setSubmittedQuestionIds((prev) => prev.filter((id) => id !== payload.questionId));
        if (activeQuestionIdRef.current === payload.questionId) {
          clearCurrentInputs();
        }
      }
    };
    const onSpeakerQuestions = (payload: SpeakerQuestionsPayload) => {
      setSpeakerQuestions(payload);
    };
    const onSubmitted = () => {
      const activeQuestionId = activeQuestionIdRef.current;
      if (activeQuestionId) {
        const currentSelection = getCurrentSelection();
        setSubmittedAnswers((prev) => ({
          ...prev,
          [activeQuestionId]: [...currentSelection],
        }));
        setSubmittedQuestionIds((prev) =>
          prev.includes(activeQuestionId) ? prev : [...prev, activeQuestionId],
        );
        onQuestionSubmitted?.(activeQuestionId);
        setPlayerAnswersHydrated(true);
      }
    };
    socket.on("state:quiz", onState);
    socket.on("error:message", onError);
    socket.on("connect_error", onConnectError);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("quiz:joined", onJoined);
    socket.on("player:answers", onPlayerAnswers);
    socket.on("answer:submitted", onSubmitted);
    socket.on("answers:reset:done", onAnswersReset);
    socket.on("answers:cleared", onAnswersCleared);
    socket.on("speaker:questions:update", onSpeakerQuestions);
    return () => {
      socket.off("state:quiz", onState);
      socket.off("error:message", onError);
      socket.off("connect_error", onConnectError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("quiz:joined", onJoined);
      socket.off("player:answers", onPlayerAnswers);
      socket.off("answer:submitted", onSubmitted);
      socket.off("answers:reset:done", onAnswersReset);
      socket.off("answers:cleared", onAnswersCleared);
      socket.off("speaker:questions:update", onSpeakerQuestions);
    };
    // Регистрация слушателей один раз; актуальные ref/update через замыкание refs.
  }, [
    setConnectionStatus,
    setError,
    setJoined,
    setQuiz,
    setRankOrder,
    setSelected,
    setSubmittedAnswers,
    setSubmittedQuestionIds,
    setPlayerAnswersHydrated,
    onQuestionSubmitted,
    setTagAnswers,
    activeQuestionIdRef,
    activeQuestionTypeRef,
    rankOrderRef,
    selectedRef,
    tagAnswersRef,
    setSpeakerQuestions,
    onParticipantMissing,
    onQuizJoined,
  ]);
}
