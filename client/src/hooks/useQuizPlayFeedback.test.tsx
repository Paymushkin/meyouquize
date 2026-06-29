// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActiveFeedbackForm } from "../types/feedback";
import { useQuizPlayFeedback } from "./useQuizPlayFeedback";

type Handler = (...args: unknown[]) => void;

const { handlers, mockSocket } = vi.hoisted(() => {
  const hoistedHandlers = new Map<string, Set<Handler>>();
  const hoistedSocket = {
    on: vi.fn((event: string, cb: Handler) => {
      const set = hoistedHandlers.get(event) ?? new Set<Handler>();
      set.add(cb);
      hoistedHandlers.set(event, set);
    }),
    off: vi.fn((event: string, cb: Handler) => {
      hoistedHandlers.get(event)?.delete(cb);
    }),
    emit: vi.fn(),
  };
  return { handlers: hoistedHandlers, mockSocket: hoistedSocket };
});

vi.mock("../socket", () => ({ socket: mockSocket }));

function fireSocketEvent(event: string, payload?: unknown) {
  const set = handlers.get(event);
  if (!set) return;
  for (const cb of set) cb(payload);
}

function makeForm(): ActiveFeedbackForm {
  return {
    id: "fb-1",
    title: "Feedback",
    scales: [
      {
        id: "scale-1",
        label: "How was it?",
        options: ["1", "2", "3", "4", "5"],
      },
    ],
    openFields: [],
    commentEnabled: false,
    commentPlaceholder: "",
    isClosed: false,
    activatedAt: "2026-01-01T12:00:00.000Z",
  };
}

describe("useQuizPlayFeedback", () => {
  beforeEach(() => {
    handlers.clear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it("shows popup after feedback status is known", () => {
    const form = makeForm();
    const { result } = renderHook(() =>
      useQuizPlayFeedback({
        quizId: "quiz-1",
        activeFeedbackForm: form,
        joined: true,
      }),
    );

    expect(result.current.shouldShowFeedbackPopup).toBe(false);
    expect(result.current.shouldDeferQuestionPopup).toBe(true);

    act(() => fireSocketEvent("player:feedback-status", { submitted: false }));

    expect(result.current.shouldShowFeedbackPopup).toBe(true);
    expect(result.current.shouldDeferQuestionPopup).toBe(true);
  });

  it("enables submit when all scales are answered", () => {
    const form = makeForm();
    const { result } = renderHook(() =>
      useQuizPlayFeedback({
        quizId: "quiz-1",
        activeFeedbackForm: form,
        joined: true,
      }),
    );

    act(() => fireSocketEvent("player:feedback-status", { submitted: false }));
    expect(result.current.canSubmitFeedback).toBe(false);

    act(() => result.current.selectScaleOption("scale-1", 3));
    expect(result.current.canSubmitFeedback).toBe(true);
  });

  it("emits feedback:submit with scale answers", () => {
    const form = makeForm();
    const { result } = renderHook(() =>
      useQuizPlayFeedback({
        quizId: "quiz-1",
        activeFeedbackForm: form,
        joined: true,
      }),
    );

    act(() => fireSocketEvent("player:feedback-status", { submitted: false }));
    act(() => result.current.selectScaleOption("scale-1", 2));
    act(() => result.current.submitFeedback());

    expect(mockSocket.emit).toHaveBeenCalledWith("feedback:submit", {
      quizId: "quiz-1",
      scaleAnswers: { "scale-1": 2 },
      openFieldAnswers: {},
    });
  });

  it("hides popup after dismiss until next activation", () => {
    const form = makeForm();
    const { result } = renderHook(() =>
      useQuizPlayFeedback({
        quizId: "quiz-1",
        activeFeedbackForm: form,
        joined: true,
      }),
    );

    act(() => fireSocketEvent("player:feedback-status", { submitted: false }));
    act(() => result.current.closeFeedbackPopup());

    expect(result.current.shouldShowFeedbackPopup).toBe(false);
    expect(result.current.shouldDeferQuestionPopup).toBe(false);
  });

  it("stops deferring question popup after feedback is submitted", () => {
    const form = makeForm();
    const { result } = renderHook(() =>
      useQuizPlayFeedback({
        quizId: "quiz-1",
        activeFeedbackForm: form,
        joined: true,
      }),
    );

    act(() => fireSocketEvent("player:feedback-status", { submitted: false }));
    expect(result.current.shouldDeferQuestionPopup).toBe(true);

    act(() => fireSocketEvent("feedback:submitted"));
    expect(result.current.shouldDeferQuestionPopup).toBe(false);
  });
});
