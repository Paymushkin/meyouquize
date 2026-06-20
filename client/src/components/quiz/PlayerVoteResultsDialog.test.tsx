// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";
import { PlayerVoteResultsDialog } from "./PlayerVoteResultsDialog";

const tile: PlayerVisibleResultTile = {
  questionId: "q1",
  text: "Favorite color?",
  type: "single",
  optionStats: [
    { optionId: "o1", text: "Red", count: 3, isCorrect: true },
    { optionId: "o2", text: "Blue", count: 1, isCorrect: false },
  ],
};

describe("PlayerVoteResultsDialog", () => {
  it("renders question and option stats", () => {
    render(
      <PlayerVoteResultsDialog
        open
        tile={tile}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
        submittedAnswersByQuestionId={{ q1: ["o1"] }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Результаты голосования")).toBeTruthy();
    expect(screen.getByText("Favorite color?")).toBeTruthy();
    expect(screen.getByText("Red")).toBeTruthy();
    expect(screen.getByText("Blue")).toBeTruthy();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <PlayerVoteResultsDialog
        open
        tile={tile}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
        submittedAnswersByQuestionId={{}}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByLabelText("Закрыть"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows temperature subtitle from admin as result headline", () => {
    render(
      <PlayerVoteResultsDialog
        open
        tile={{
          questionId: "q-temp",
          text: "Температура зала",
          type: "temperature",
          temperatureValue: 25,
          temperatureSubtitle: "Оцените уровень вовлечённости аудитории",
          optionStats: [{ optionId: "o1", text: "1", count: 1, isCorrect: false }],
        }}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
        submittedAnswersByQuestionId={{}}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Оцените уровень вовлечённости аудитории: 25 / 100")).toBeTruthy();
  });
});
