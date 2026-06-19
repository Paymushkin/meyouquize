// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActiveQuestion, QuizState } from "../pages/quiz-play/types";
import { useQuizPlayQuestionFlow } from "./useQuizPlayQuestionFlow";

const { mockSocket } = vi.hoisted(() => ({
  mockSocket: { emit: vi.fn() },
}));

vi.mock("../socket", () => ({ socket: mockSocket }));

function makeQuestion(overrides: Partial<ActiveQuestion> = {}): ActiveQuestion {
  return {
    id: "q1",
    text: "Pick one",
    type: "single",
    options: [
      { id: "o1", text: "A" },
      { id: "o2", text: "B" },
    ],
    isClosed: false,
    ...overrides,
  };
}

function makeQuiz(overrides: Partial<QuizState> = {}): QuizState {
  const question = makeQuestion();
  return {
    id: "quiz-1",
    title: "Test quiz",
    status: "LIVE",
    quizProgress: { subQuizId: "sq1", index: 1, total: 1 },
    activeQuestion: question,
    activeQuestions: [question],
    ...overrides,
  };
}

describe("useQuizPlayQuestionFlow", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("toggles single-choice option", () => {
    const quiz = makeQuiz();
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: [],
        submittedAnswers: {},
        playerAnswersHydrated: true,
      }),
    );

    act(() => result.current.toggleOption("o1"));
    expect(result.current.selected).toEqual(["o1"]);

    act(() => result.current.toggleOption("o2"));
    expect(result.current.selected).toEqual(["o2"]);
  });

  it("emits answer:submit for selected options", () => {
    const quiz = makeQuiz();
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: [],
        submittedAnswers: {},
        playerAnswersHydrated: true,
      }),
    );

    act(() => result.current.toggleOption("o1"));
    act(() => result.current.submit());

    expect(mockSocket.emit).toHaveBeenCalledWith("answer:submit", {
      quizId: "quiz-1",
      questionId: "q1",
      optionIds: ["o1"],
    });
  });

  it("submits tag cloud answers expanded from input", () => {
    const question = makeQuestion({ type: "tag_cloud", maxAnswers: 3 });
    const quiz = makeQuiz({ activeQuestion: question, activeQuestions: [question] });
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: [],
        submittedAnswers: {},
        playerAnswersHydrated: true,
      }),
    );

    act(() => result.current.setTagAnswers(["alpha"]));
    act(() => result.current.submit());

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "answer:submit",
      expect.objectContaining({
        questionId: "q1",
        tagAnswers: ["alpha"],
      }),
    );
  });

  it("reorders ranking options", () => {
    const question = makeQuestion({
      type: "ranking",
      options: [
        { id: "r1", text: "First" },
        { id: "r2", text: "Second" },
      ],
    });
    const quiz = makeQuiz({ activeQuestion: question, activeQuestions: [question] });
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: [],
        submittedAnswers: {},
        playerAnswersHydrated: true,
      }),
    );

    expect(result.current.rankOrder).toEqual(["r1", "r2"]);
    act(() => result.current.moveRankOption("r1", 1));
    expect(result.current.rankOrder).toEqual(["r2", "r1"]);
  });

  it("hides popup after dismiss", () => {
    const quiz = makeQuiz();
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: [],
        submittedAnswers: {},
        playerAnswersHydrated: true,
      }),
    );

    act(() => result.current.closeQuestionPopup());
    expect(result.current.shouldHideDismissedPopup).toBe(true);
  });

  it("blocks submit when question already answered", () => {
    const quiz = makeQuiz();
    const { result } = renderHook(() =>
      useQuizPlayQuestionFlow({
        quiz,
        submittedQuestionIds: ["q1"],
        submittedAnswers: { q1: ["o1"] },
        playerAnswersHydrated: true,
      }),
    );

    act(() => result.current.toggleOption("o2"));
    expect(result.current.canSubmit).toBe(false);
  });
});
