import { describe, expect, it, vi } from "vitest";
import type { QuestionForm } from "../../admin/adminEventForm";
import {
  runAdminQuestionRevealResultsFlow,
  runAdminQuestionSlideshowFlow,
} from "./adminQuestionProjectorFlow";

function baseQuestion(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    id: "q-1",
    subQuizId: null,
    text: "Question",
    type: "single",
    editorQuizMode: false,
    points: 1,
    maxAnswers: 1,
    options: [
      { text: "A", isCorrect: true },
      { text: "B", isCorrect: false },
    ],
    ...overrides,
  };
}

function createCtx(overrides: Partial<Parameters<typeof runAdminQuestionSlideshowFlow>[0]> = {}) {
  return {
    question: baseQuestion(),
    revealResultsOnProjector: false,
    chartsOnProjector: false,
    setMessage: vi.fn(),
    setQuestionRevealStageForQuestion: vi.fn(),
    setPublicResultsView: vi.fn(),
    ...overrides,
  };
}

describe("runAdminQuestionSlideshowFlow", () => {
  it("requires saved question id", () => {
    const ctx = createCtx({ question: baseQuestion({ id: undefined }) });
    runAdminQuestionSlideshowFlow(ctx);
    expect(ctx.setMessage).toHaveBeenCalledWith("Сначала сохраните вопрос");
    expect(ctx.setPublicResultsView).not.toHaveBeenCalled();
  });

  it("shows question on projector for regular vote", () => {
    const ctx = createCtx();
    runAdminQuestionSlideshowFlow(ctx);
    expect(ctx.setPublicResultsView).toHaveBeenCalledWith("question", "q-1");
  });

  it("resets reveal stage when results already shown", () => {
    const ctx = createCtx({ revealResultsOnProjector: true });
    runAdminQuestionSlideshowFlow(ctx);
    expect(ctx.setQuestionRevealStageForQuestion).toHaveBeenCalledWith("q-1", "options");
  });

  it("uses options stage for tag cloud", () => {
    const ctx = createCtx({
      question: baseQuestion({ type: "tag_cloud", maxAnswers: 3, options: [] }),
    });
    runAdminQuestionSlideshowFlow(ctx);
    expect(ctx.setQuestionRevealStageForQuestion).toHaveBeenCalledWith("q-1", "options");
  });
});

describe("runAdminQuestionRevealResultsFlow", () => {
  it("reveals results stage for single vote", () => {
    const ctx = createCtx();
    runAdminQuestionRevealResultsFlow(ctx);
    expect(ctx.setQuestionRevealStageForQuestion).toHaveBeenCalledWith("q-1", "results");
  });

  it("returns to title when results already on screen", () => {
    const ctx = createCtx({ revealResultsOnProjector: true });
    runAdminQuestionRevealResultsFlow(ctx);
    expect(ctx.setPublicResultsView).toHaveBeenCalledWith("title");
  });
});
