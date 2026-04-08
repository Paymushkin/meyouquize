import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { socket } from "../socket";
import type { QuizState } from "../pages/quiz-play/types";

type Params = {
  activeQuestionIdRef: MutableRefObject<string | null>;
  activeQuestionTypeRef: MutableRefObject<"single" | "multi" | "tag_cloud" | null>;
  selectedRef: MutableRefObject<string[]>;
  tagAnswersRef: MutableRefObject<string[]>;
  setQuiz: Dispatch<SetStateAction<QuizState | null>>;
  setSelected: Dispatch<SetStateAction<string[]>>;
  setTagAnswers: Dispatch<SetStateAction<string[]>>;
  setSubmittedAnswers: Dispatch<SetStateAction<Record<string, string[]>>>;
  setSubmittedQuestionIds: Dispatch<SetStateAction<string[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setJoined: Dispatch<SetStateAction<boolean>>;
};

export function useQuizPlaySocket({
  activeQuestionIdRef,
  activeQuestionTypeRef,
  selectedRef,
  tagAnswersRef,
  setQuiz,
  setSelected,
  setTagAnswers,
  setSubmittedAnswers,
  setSubmittedQuestionIds,
  setError,
  setJoined,
}: Params) {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const onState = (state: QuizState) => {
      setQuiz(state);
      setSelected([]);
      setTagAnswers([""]);
    };
    const onError = (evt: { message: string }) => {
      if (evt.message === "Already answered this question") {
        const activeQuestionId = activeQuestionIdRef.current;
        if (activeQuestionId) {
          setSubmittedQuestionIds((prev) =>
            prev.includes(activeQuestionId) ? prev : [...prev, activeQuestionId],
          );
        }
        return;
      }
      setError(evt.message);
    };
    const onConnectError = () => {
      setError("Нет соединения с сервером квиза. Проверьте, что backend доступен в вашей Wi-Fi сети.");
    };
    const onConnect = () => {
      setError("");
    };
    const onJoined = () => {
      setJoined(true);
    };
    const onPlayerAnswers = (answers: Record<string, string[]>) => {
      setSubmittedAnswers(answers);
      setSubmittedQuestionIds(Object.keys(answers));
    };
    const onAnswersReset = () => {
      setSubmittedAnswers({});
      setSubmittedQuestionIds([]);
      setSelected([]);
      setError("");
    };
    const onAnswersCleared = (payload: { all?: boolean; questionId?: string }) => {
      if (payload.all) {
        setSubmittedAnswers({});
        setSubmittedQuestionIds([]);
        setSelected([]);
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
          setSelected([]);
        }
      }
    };
    const onSubmitted = () => {
      const activeQuestionId = activeQuestionIdRef.current;
      if (activeQuestionId) {
        const currentSelection = activeQuestionTypeRef.current === "tag_cloud"
          ? tagAnswersRef.current.map((value) => value.trim()).filter(Boolean)
          : selectedRef.current;
        setSubmittedAnswers((prev) => ({
          ...prev,
          [activeQuestionId]: [...currentSelection],
        }));
        setSubmittedQuestionIds((prev) =>
          prev.includes(activeQuestionId) ? prev : [...prev, activeQuestionId],
        );
      }
    };
    socket.on("state:quiz", onState);
    socket.on("error:message", onError);
    socket.on("connect_error", onConnectError);
    socket.on("connect", onConnect);
    socket.on("quiz:joined", onJoined);
    socket.on("player:answers", onPlayerAnswers);
    socket.on("answer:submitted", onSubmitted);
    socket.on("answers:reset:done", onAnswersReset);
    socket.on("answers:cleared", onAnswersCleared);
    return () => {
      socket.off("state:quiz", onState);
      socket.off("error:message", onError);
      socket.off("connect_error", onConnectError);
      socket.off("connect", onConnect);
      socket.off("quiz:joined", onJoined);
      socket.off("player:answers", onPlayerAnswers);
      socket.off("answer:submitted", onSubmitted);
      socket.off("answers:reset:done", onAnswersReset);
      socket.off("answers:cleared", onAnswersCleared);
    };
  // Регистрация слушателей один раз; актуальные ref/update через замыкание refs.
  }, []);
}
