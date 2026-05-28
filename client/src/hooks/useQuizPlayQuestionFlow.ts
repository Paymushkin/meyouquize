import { expandTagCloudSubmitLines } from "@meyouquize/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../socket";
import {
  isSubQuizAutoFlow,
  resolveQuizProgressForQuestion,
} from "../pages/quiz-play/resolveQuizProgressDisplay";
import type { QuizState } from "../pages/quiz-play/types";

type SubmitPayload = {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  rankedOptionIds?: string[];
  tagAnswers?: string[];
};

type Params = {
  quiz: QuizState | null;
  submittedQuestionIds: string[];
  submittedAnswers: Record<string, string[]>;
  playerAnswersHydrated: boolean;
};

export function useQuizPlayQuestionFlow(params: Params) {
  const { quiz, submittedQuestionIds, submittedAnswers, playerAnswersHydrated } = params;
  const [selected, setSelected] = useState<string[]>([]);
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [tagAnswers, setTagAnswers] = useState<string[]>([""]);
  const [acceptedQuestionId, setAcceptedQuestionId] = useState<string | null>(null);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const activeQuestionTypeRef = useRef<"single" | "multi" | "tag_cloud" | "ranking" | null>(null);
  const selectedRef = useRef<string[]>([]);
  const rankOrderRef = useRef<string[]>([]);
  const tagAnswersRef = useRef<string[]>([""]);
  const pendingSubmitPayloadRef = useRef<SubmitPayload | null>(null);

  const nonQuizActiveQuestion = useMemo(() => {
    if (!quiz) return null;
    const activeList = Array.isArray(quiz.activeQuestions)
      ? quiz.activeQuestions
      : quiz.activeQuestion
        ? [quiz.activeQuestion]
        : [];
    if (acceptedQuestionId) {
      const accepted = activeList.find((q) => q.id === acceptedQuestionId);
      if (accepted) return accepted;
    }
    const autoFlow = isSubQuizAutoFlow(quiz.quizProgress) || activeList.length > 1;
    if (!quiz.quizProgress || autoFlow) {
      return activeList.find((q) => !submittedQuestionIds.includes(q.id)) ?? null;
    }
    return quiz.activeQuestion;
  }, [quiz, submittedQuestionIds, acceptedQuestionId]);

  useEffect(() => {
    activeQuestionIdRef.current = nonQuizActiveQuestion?.id ?? null;
    activeQuestionTypeRef.current = nonQuizActiveQuestion?.type ?? null;
  }, [nonQuizActiveQuestion]);

  useEffect(() => {
    if (!nonQuizActiveQuestion) {
      setSelected([]);
      setRankOrder([]);
      setTagAnswers([""]);
      return;
    }
    setSelected([]);
    setTagAnswers([""]);
    if (nonQuizActiveQuestion.type === "ranking") {
      setRankOrder(nonQuizActiveQuestion.options.map((o) => o.id));
      return;
    }
    setRankOrder([]);
  }, [nonQuizActiveQuestion?.id]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    rankOrderRef.current = rankOrder;
  }, [rankOrder]);

  useEffect(() => {
    tagAnswersRef.current = tagAnswers;
  }, [tagAnswers]);

  useEffect(() => {
    const q = nonQuizActiveQuestion;
    if (!q || q.type !== "ranking") {
      setRankOrder([]);
      return;
    }
    setRankOrder(q.options.map((o) => o.id));
  }, [nonQuizActiveQuestion]);

  const canSubmit = useMemo(() => {
    if (!quiz || !nonQuizActiveQuestion) return false;
    const alreadySubmitted = submittedQuestionIds.includes(nonQuizActiveQuestion.id);
    if (nonQuizActiveQuestion.type === "tag_cloud") {
      const filled = tagAnswers.map((value) => value.trim()).filter(Boolean);
      return filled.length > 0 && !nonQuizActiveQuestion.isClosed && !alreadySubmitted;
    }
    if (nonQuizActiveQuestion.type === "ranking") {
      const n = nonQuizActiveQuestion.options.length;
      const setOk = new Set(rankOrder);
      return (
        n > 0 &&
        rankOrder.length === n &&
        rankOrder.every((id) => setOk.has(id)) &&
        setOk.size === n &&
        !nonQuizActiveQuestion.isClosed &&
        !alreadySubmitted
      );
    }
    return selected.length > 0 && !nonQuizActiveQuestion.isClosed && !alreadySubmitted;
  }, [quiz, nonQuizActiveQuestion, selected, rankOrder, submittedQuestionIds, tagAnswers]);

  const submit = useCallback(() => {
    if (!quiz || !nonQuizActiveQuestion || !canSubmit) return;
    if (nonQuizActiveQuestion.type === "tag_cloud") {
      const payload = {
        quizId: quiz.id,
        questionId: nonQuizActiveQuestion.id,
        tagAnswers: expandTagCloudSubmitLines(
          tagAnswers.map((value) => value.trim()).filter(Boolean),
        ),
      };
      pendingSubmitPayloadRef.current = payload;
      socket.emit("answer:submit", payload);
      return;
    }
    if (nonQuizActiveQuestion.type === "ranking") {
      const payload = {
        quizId: quiz.id,
        questionId: nonQuizActiveQuestion.id,
        rankedOptionIds: rankOrder,
      };
      pendingSubmitPayloadRef.current = payload;
      socket.emit("answer:submit", payload);
      return;
    }
    const payload = {
      quizId: quiz.id,
      questionId: nonQuizActiveQuestion.id,
      optionIds: selected,
    };
    pendingSubmitPayloadRef.current = payload;
    socket.emit("answer:submit", payload);
  }, [quiz, nonQuizActiveQuestion, canSubmit, tagAnswers, rankOrder, selected]);

  const onQuestionSubmitted = useCallback((questionId: string) => {
    setAcceptedQuestionId(questionId);
    if (pendingSubmitPayloadRef.current?.questionId === questionId) {
      pendingSubmitPayloadRef.current = null;
    }
  }, []);

  const onQuizJoined = useCallback(() => {
    const payload = pendingSubmitPayloadRef.current;
    if (!payload) return;
    socket.emit("answer:submit", payload);
  }, []);

  const toggleOption = useCallback(
    (id: string) => {
      if (!nonQuizActiveQuestion) return;
      if (nonQuizActiveQuestion.type === "single") {
        setSelected((prev) => (prev.includes(id) ? [] : [id]));
        return;
      }
      setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
    },
    [nonQuizActiveQuestion],
  );

  const moveRankOption = useCallback((id: string, direction: -1 | 1) => {
    setRankOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j]!;
      next[j] = tmp!;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!acceptedQuestionId) return;
    const timer = window.setTimeout(() => {
      setDismissedQuestionId(acceptedQuestionId);
      setAcceptedQuestionId(null);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [acceptedQuestionId]);

  useEffect(() => {
    const activeQuestionId = nonQuizActiveQuestion?.id;
    if (!activeQuestionId) {
      setDismissedQuestionId(null);
      return;
    }
    if (dismissedQuestionId && dismissedQuestionId !== activeQuestionId) {
      setDismissedQuestionId(null);
    }
  }, [nonQuizActiveQuestion?.id, dismissedQuestionId]);

  const closeQuestionPopup = useCallback(() => {
    const activeQuestionId = nonQuizActiveQuestion?.id;
    if (!activeQuestionId) return;
    setDismissedQuestionId(activeQuestionId);
    if (acceptedQuestionId === activeQuestionId) {
      setAcceptedQuestionId(null);
    }
  }, [nonQuizActiveQuestion?.id, acceptedQuestionId]);

  const resetQuestionFlow = useCallback(() => {
    setSelected([]);
    setRankOrder([]);
    setTagAnswers([""]);
    setAcceptedQuestionId(null);
    setDismissedQuestionId(null);
    pendingSubmitPayloadRef.current = null;
  }, []);

  const answeredCurrentQuestion =
    !!nonQuizActiveQuestion?.id && submittedQuestionIds.includes(nonQuizActiveQuestion.id);
  const isShowingAcceptedInPopup =
    !!nonQuizActiveQuestion?.id && acceptedQuestionId === nonQuizActiveQuestion.id;
  const shouldHideAnsweredPopup = answeredCurrentQuestion && !isShowingAcceptedInPopup;
  const shouldHideAnsweredUntilHydrated = !playerAnswersHydrated;
  const shouldHideDismissedPopup =
    !!nonQuizActiveQuestion?.id && dismissedQuestionId === nonQuizActiveQuestion.id;
  const displayedSelected =
    nonQuizActiveQuestion?.id && submittedAnswers[nonQuizActiveQuestion.id]
      ? submittedAnswers[nonQuizActiveQuestion.id]
      : nonQuizActiveQuestion?.type === "ranking"
        ? rankOrder
        : selected;

  const displayedQuizProgress = useMemo(() => {
    if (!quiz?.quizProgress || !nonQuizActiveQuestion?.id) return quiz?.quizProgress ?? null;
    const resolved = resolveQuizProgressForQuestion(
      quiz.quizProgress,
      nonQuizActiveQuestion.id,
      quiz.activeQuestion,
    );
    if (!resolved) return null;
    return resolved;
  }, [quiz?.quizProgress, quiz?.activeQuestion, quiz?.activeQuestions, nonQuizActiveQuestion?.id]);

  return {
    nonQuizActiveQuestion,
    selected,
    setSelected,
    rankOrder,
    setRankOrder,
    tagAnswers,
    setTagAnswers,
    activeQuestionIdRef,
    activeQuestionTypeRef,
    selectedRef,
    rankOrderRef,
    tagAnswersRef,
    canSubmit,
    toggleOption,
    moveRankOption,
    submit,
    onQuestionSubmitted,
    onQuizJoined,
    closeQuestionPopup,
    resetQuestionFlow,
    answeredCurrentQuestion,
    shouldHideAnsweredPopup,
    shouldHideAnsweredUntilHydrated,
    shouldHideDismissedPopup,
    displayedSelected,
    displayedQuizProgress,
    acceptedQuestionId,
  };
}
