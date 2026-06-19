// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import type { ActiveQuestion, QuizState } from "../pages/quiz-play/types";
import { useQuizPlayCompletion } from "./useQuizPlayCompletion";

function makeQuestion(id = "q1"): ActiveQuestion {
  return {
    id,
    text: "Question",
    type: "single",
    options: [{ id: "o1", text: "A" }],
    isClosed: false,
  };
}

function makeQuiz(overrides: Partial<QuizState> = {}): QuizState {
  const question = makeQuestion();
  return {
    id: "quiz-1",
    title: "Quiz",
    status: "LIVE",
    quizProgress: { subQuizId: "sq1", index: 1, total: 1, orderedQuestionIds: ["q1"] },
    activeQuestion: question,
    ...overrides,
  };
}

describe("useQuizPlayCompletion", () => {
  it("shows sub-quiz complete card after last question is submitted", () => {
    const progressRef = createRef<{ questionId: string; index: number; total: number } | null>();
    const { result, rerender } = renderHook(
      ({ submitted }: { submitted: string[] }) =>
        useQuizPlayCompletion({
          slug: "room-a",
          joined: true,
          quiz: makeQuiz(),
          submittedQuestionIds: submitted,
          lastSubQuizProgressRef: progressRef,
        }),
      { initialProps: { submitted: [] as string[] } },
    );

    rerender({ submitted: ["q1"] });
    expect(result.current.showSubQuizCompleteCard).toBe(true);
  });

  it("shows finished completion card when quiz is finished", () => {
    const progressRef = createRef<{ questionId: string; index: number; total: number } | null>();
    const { result } = renderHook(() =>
      useQuizPlayCompletion({
        slug: "room-a",
        joined: true,
        quiz: makeQuiz({ status: "FINISHED", activeQuestion: null }),
        submittedQuestionIds: [],
        lastSubQuizProgressRef: progressRef,
      }),
    );

    expect(result.current.showFinishedCompletionCard).toBe(true);
    expect(result.current.hasActiveQuestion).toBe(false);
  });

  it("resets completion state when slug changes", () => {
    const progressRef = createRef<{ questionId: string; index: number; total: number } | null>();
    const { result, rerender } = renderHook(
      ({ slug, submitted }: { slug: string; submitted: string[] }) =>
        useQuizPlayCompletion({
          slug,
          joined: true,
          quiz: makeQuiz(),
          submittedQuestionIds: submitted,
          lastSubQuizProgressRef: progressRef,
        }),
      { initialProps: { slug: "room-a", submitted: [] as string[] } },
    );

    rerender({ slug: "room-a", submitted: ["q1"] });
    expect(result.current.showSubQuizCompleteCard).toBe(true);

    rerender({ slug: "room-b", submitted: ["q1"] });
    expect(result.current.showSubQuizCompleteCard).toBe(false);
  });
});
