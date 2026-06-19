// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerVoteOptionsGrid } from "./PlayerVoteOptionsGrid";
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
