// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";
import { PlayerVisibleResultTileCard } from "./PlayerVisibleResultTileCard";

const tile: PlayerVisibleResultTile = {
  questionId: "q1",
  text: "Results preview",
  imageUrl: "https://example.com/q.png",
  type: "single",
  optionStats: [
    { optionId: "o1", text: "Yes", count: 8, isCorrect: true },
    { optionId: "o2", text: "No", count: 2, isCorrect: false },
  ],
};

describe("PlayerVisibleResultTileCard", () => {
  it("renders tile title and top option previews", () => {
    render(
      <PlayerVisibleResultTileCard
        tile={tile}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Results preview")).toBeTruthy();
    expect(screen.getByText("Yes")).toBeTruthy();
    expect(screen.getByText("No")).toBeTruthy();
  });

  it("calls onSelect when tile clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <PlayerVisibleResultTileCard
        tile={tile}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(container.querySelector("button[type='button']")!);
    expect(onSelect).toHaveBeenCalled();
  });
});
