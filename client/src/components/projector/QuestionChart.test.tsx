// @vitest-environment jsdom

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { QuestionChart } from "../projector/QuestionChart";

const theme = createTheme();

const singleQuestion: ProjectorQuestionResult = {
  questionId: "q1",
  text: "Pick one",
  type: "single",
  optionStats: [
    { optionId: "o1", text: "Alpha", count: 3, isCorrect: true },
    { optionId: "o2", text: "Beta", count: 1, isCorrect: false },
  ],
};

function renderChart(question: ProjectorQuestionResult) {
  return render(
    <ThemeProvider theme={theme}>
      <QuestionChart question={question} showVoteCount />
    </ThemeProvider>,
  );
}

describe("QuestionChart", () => {
  it("renders bar rows for single-choice results", () => {
    renderChart(singleQuestion);
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
  });

  it("returns null when there is no data", () => {
    const { container } = renderChart({
      questionId: "empty",
      text: "",
      type: "single",
      optionStats: [],
    });
    expect(container.firstChild).toBeNull();
  });
});
