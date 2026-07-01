import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { expandTagCloudSubmitLines } from "@meyouquize/shared";
import { socket } from "../socket";
import type { QuizState } from "../pages/quiz-play/types";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import {
  isSocketConnectionErrorMessage,
  socketConnectErrorMessage,
} from "../utils/socketConnectErrorMessage";
import { parseSocketErrorCode, parseSocketErrorMessage } from "../utils/socketError";

type SubmitPayload = {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  rankedOptionIds?: string[];
  tagAnswers?: string[];
};

type Params = {
  activeQuestionIdRef: MutableRefObject<string | null>;
  activeQuestionTypeRef: MutableRefObject<
    "single" | "multi" | "tag_cloud" | "ranking" | "temperature" | null
  >;
  selectedRef: MutableRefObject<string[]>;
  rankOrderRef: MutableRefObject<string[]>;
  tagAnswersRef: MutableRefObject<string[]>;
  pendingSubmitPayloadRef?: MutableRefObject<SubmitPayload | null>;
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
  /** Сброс «вошёл» в localStorage при ошибке входа (занятый ник и т.п.). */
  onJoinFailed?: () => void;
  /** Вход завершён (успех или ошибка) — снять индикатор ожидания. */
  onJoinSettled?: () => void;
  /** Актуальный joined — для reconnect без показа экрана входа. */
  joinedRef: MutableRefObject<boolean>;
  onQuizSessionReadyChange?: (ready: boolean) => void;
};

export function useQuizPlaySocket({
  activeQuestionIdRef,
  activeQuestionTypeRef,
  selectedRef,
  rankOrderRef,
  tagAnswersRef,
  pendingSubmitPayloadRef,
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
  onJoinFailed,
  onJoinSettled,
  joinedRef,
  onQuizSessionReadyChange,
}: Params) {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const getCurrentSelection = () => {
      if (activeQuestionTypeRef.current === "tag_cloud") {
        return expandTagCloudSubmitLines(
          tagAnswersRef.current.map((value) => value.trim()).filter(Boolean),
        );
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
      setQuiz((prev) => {
        let merged: QuizState = state;
        if (
          typeof state.myTotalScore !== "number" &&
          prev &&
          typeof prev.myTotalScore === "number"
        ) {
          merged = { ...merged, myTotalScore: prev.myTotalScore };
        }
        if (state.mySubQuizScores == null && prev?.mySubQuizScores) {
          merged = { ...merged, mySubQuizScores: prev.mySubQuizScores };
        }
        return merged;
      });
      if (prevQuestionId !== nextQuestionId || prevQuestionType !== nextQuestionType) {
        clearAllInputs();
      }
    };
    const onPlayerQuizScore = (payload: {
      myTotalScore?: number;
      mySubQuizScores?: Record<string, number>;
    }) => {
      if (typeof payload?.myTotalScore !== "number" && payload?.mySubQuizScores == null) return;
      setQuiz((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(typeof payload.myTotalScore === "number"
            ? { myTotalScore: payload.myTotalScore }
            : {}),
          ...(payload.mySubQuizScores != null ? { mySubQuizScores: payload.mySubQuizScores } : {}),
        };
      });
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
      if (message === "Not joined") {
        onParticipantMissing?.();
        setError("");
        return;
      }
      if (message === "Question is not open") {
        setError("Вопрос ещё не открыт. Подождите, пока ведущий его запустит.");
        return;
      }
      if (message.startsWith("Too many tags:")) {
        setError("Слишком много тегов для этого вопроса. Уберите лишние ответы.");
        return;
      }
      if (code === "NICKNAME_TAKEN" || message === "Ник уже используется в этой комнате") {
        onJoinFailed?.();
        onJoinSettled?.();
        return;
      }
      const displayMessage =
        message === "Join failed"
          ? "Не удалось войти в комнату. Проверьте имя и повторите попытку."
          : message;
      setError(displayMessage);
      onJoinSettled?.();
    };
    const onConnectError = () => {
      setConnectionStatus("reconnecting");
      setError(socketConnectErrorMessage());
    };
    const onConnect = () => {
      if (joinedRef.current) {
        setConnectionStatus("reconnecting");
      } else {
        setConnectionStatus("online");
      }
      setError((prev) => (isSocketConnectionErrorMessage(prev) ? "" : prev));
    };
    const onDisconnect = () => {
      if (joinedRef.current) {
        onQuizSessionReadyChange?.(false);
        setConnectionStatus("reconnecting");
        return;
      }
      setConnectionStatus("offline");
    };
    const onJoined = () => {
      setJoined(true);
      onQuizSessionReadyChange?.(true);
      setConnectionStatus("online");
      onQuizJoined?.();
      onJoinSettled?.();
    };
    const onPlayerAnswers = (answers: Record<string, string[]>) => {
      hydrateSubmittedAnswers(answers);
    };
    const onAnswersReset = () => {
      hydrateSubmittedAnswers({});
      clearCurrentInputs();
      setError("");
    };
    const onAnswersCleared = (payload: {
      all?: boolean;
      questionId?: string;
      questionIds?: string[];
    }) => {
      if (payload.all) {
        hydrateSubmittedAnswers({});
        clearCurrentInputs();
        return;
      }
      const clearedIds = payload.questionIds ?? (payload.questionId ? [payload.questionId] : []);
      if (clearedIds.length > 0) {
        const clearedSet = new Set(clearedIds);
        setSubmittedAnswers((prev) => {
          const next = { ...prev };
          for (const id of clearedIds) delete next[id];
          return next;
        });
        setSubmittedQuestionIds((prev) => prev.filter((id) => !clearedSet.has(id)));
        if (activeQuestionIdRef.current != null && clearedSet.has(activeQuestionIdRef.current)) {
          clearCurrentInputs();
        }
      }
    };
    const onSpeakerQuestions = (payload: SpeakerQuestionsPayload) => {
      setSpeakerQuestions(payload);
    };
    const resolveSubmittedSelection = (payload: SubmitPayload | null | undefined): string[] => {
      if (payload?.rankedOptionIds) return [...payload.rankedOptionIds];
      if (payload?.optionIds) return [...payload.optionIds];
      if (payload?.tagAnswers) return [...payload.tagAnswers];
      return [...getCurrentSelection()];
    };
    const onSubmitted = () => {
      const payload = pendingSubmitPayloadRef?.current ?? null;
      const questionId = payload?.questionId ?? activeQuestionIdRef.current;
      if (!questionId) return;
      const currentSelection = resolveSubmittedSelection(payload);
      setSubmittedAnswers((prev) => ({
        ...prev,
        [questionId]: currentSelection,
      }));
      setSubmittedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
      onQuestionSubmitted?.(questionId);
      setPlayerAnswersHydrated(true);
    };
    socket.on("state:quiz", onState);
    socket.on("player:quiz-score", onPlayerQuizScore);
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
      socket.off("player:quiz-score", onPlayerQuizScore);
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
    pendingSubmitPayloadRef,
    setSpeakerQuestions,
    onParticipantMissing,
    onQuizJoined,
    onJoinFailed,
    onJoinSettled,
    joinedRef,
    onQuizSessionReadyChange,
  ]);
}
