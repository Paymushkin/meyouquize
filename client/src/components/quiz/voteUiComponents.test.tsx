// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerVoteOptionsGrid, resolvePlayerVoteOptionColors } from "./PlayerVoteOptionsGrid";
import { ProjectorOptionLabel } from "./ProjectorOptionLabel";
import { VoteResultOptionRow } from "./VoteResultOptionRow";

describe("PlayerVoteOptionsGrid", () => {
  it("renders option labels", () => {
    render(
      <PlayerVoteOptionsGrid
        options={[
          { id: "a", text: "Alpha" },
          { id: "b", text: "Beta" },
        ]}
        displayedSelected={["a"]}
        answeredCurrentQuestion={false}
        brandPrimaryColor="#7c5acb"
        playerVoteOptionTextColor="#ffffff"
        onToggleOption={vi.fn()}
      />,
    );

    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("uses debate option colors for accents", () => {
    const colors = resolvePlayerVoteOptionColors(
      [
        { id: "a", text: "A", color: "#00ff00" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      true,
    );
    expect(colors).toEqual(["#00ff00", "#c62828", "#90a4ae"]);
  });
});

describe("VoteResultOptionRow", () => {
  it("renders option text and stat value", () => {
    render(
      <VoteResultOptionRow
        text="Вариант A"
        pct={42}
        rightStatValue="42%"
        isCorrectAnswer={false}
        isUserAnswer={false}
        canShowUserAnswer={false}
        playerVoteOptionTextColor="#ffffff"
        playerVoteProgressBarColor="#1976d2"
      />,
    );

    expect(screen.getByText("Вариант A")).toBeTruthy();
    expect(screen.getByText("42%")).toBeTruthy();
  });
});

describe("ProjectorOptionLabel", () => {
  it("renders text-only label", () => {
    render(<ProjectorOptionLabel text="Проекторный вариант" />);
    expect(screen.getByText("Проекторный вариант")).toBeTruthy();
  });
});
