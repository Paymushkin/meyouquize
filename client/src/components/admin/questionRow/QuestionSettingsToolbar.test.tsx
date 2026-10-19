// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { buildDebatePollQuestionPatch, buildGeoPollQuestionPatch } from "@meyouquize/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuestionForm } from "../../../admin/adminEventForm";
import { QuestionSettingsToolbar } from "./QuestionSettingsToolbar";

afterEach(() => {
  cleanup();
});

function baseQuestion(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    subQuizId: null,
    text: "Вопрос",
    type: "single",
    editorQuizMode: false,
    points: 1,
    maxAnswers: 1,
    options: [
      { text: "A", isCorrect: false },
      { text: "B", isCorrect: false },
    ],
    ...overrides,
  };
}

const toolbarHandlers = {
  updateQuestionShowVoteCount: vi.fn(),
  updateQuestionGeoPollShowAnswerList: vi.fn(),
  updateQuestionGeoPollRegionHeatEnabled: vi.fn(),
  updateQuestionShowCorrectOption: vi.fn(),
  openTagInputDialog: vi.fn(),
  confirmResetQuestionAnswersByIndex: vi.fn(),
  onTogglePlayerResults: vi.fn(),
};

describe("QuestionSettingsToolbar", () => {
  it("hides vote adjust toggle when disabled", () => {
    render(
      <QuestionSettingsToolbar
        question={baseQuestion()}
        globalIndex={0}
        {...toolbarHandlers}
        playerResultsButtonVisible={false}
        playerResultsVisible={false}
        showVoteAdjustToggle={false}
      />,
    );
    expect(screen.queryByLabelText("Правка голосов")).toBeNull();
  });

  it("shows vote adjust toggle when enabled", () => {
    render(
      <QuestionSettingsToolbar
        question={baseQuestion()}
        globalIndex={0}
        {...toolbarHandlers}
        playerResultsButtonVisible={false}
        playerResultsVisible={false}
        showVoteAdjustToggle
        voteAdjustEditVisible={false}
        onToggleVoteAdjustEdit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Правка голосов")).toBeTruthy();
  });

  it("hides vote count, correct answer and player results for geo poll; shows answer list toggle", () => {
    render(
      <QuestionSettingsToolbar
        question={baseQuestion({
          ...buildGeoPollQuestionPatch("Откуда вы?"),
          options: [],
        })}
        globalIndex={0}
        {...toolbarHandlers}
        playerResultsButtonVisible={false}
        playerResultsVisible={false}
        showVoteAdjustToggle={false}
      />,
    );
    expect(screen.queryByLabelText("Показывать кол-во голосов")).toBeNull();
    expect(screen.queryByLabelText("Показывать правильный ответ на проекторе")).toBeNull();
    expect(screen.queryByLabelText(/результаты в интерфейсе пользователя/)).toBeNull();
    expect(screen.getByLabelText("Показывать список ответов геоопроса на проекторе")).toBeTruthy();
    expect(screen.getByLabelText("Интенсивность заливки регионов геоопроса")).toBeTruthy();
  });

  it("hides vote count and correct answer for debate poll", () => {
    const debate = buildDebatePollQuestionPatch("Кого поддерживаете?");
    render(
      <QuestionSettingsToolbar
        question={baseQuestion({
          ...debate,
          options: debate.options.map((o) => ({ text: o.text, isCorrect: false, color: o.color })),
        })}
        globalIndex={0}
        {...toolbarHandlers}
        playerResultsButtonVisible
        playerResultsVisible={false}
        showVoteAdjustToggle={false}
      />,
    );
    expect(screen.queryByLabelText("Показывать кол-во голосов")).toBeNull();
    expect(screen.queryByLabelText("Показывать правильный ответ на проекторе")).toBeNull();
    expect(screen.getByLabelText("Показать результаты в интерфейсе пользователя")).toBeTruthy();
  });
});
