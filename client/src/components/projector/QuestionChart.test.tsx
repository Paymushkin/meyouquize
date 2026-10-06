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

function renderChart(
  question: ProjectorQuestionResult,
  extra?: Partial<{ questionRevealStage: "options" | "results" }>,
) {
  return render(
    <ThemeProvider theme={theme}>
      <QuestionChart
        question={question}
        showVoteCount
        questionRevealStage={extra?.questionRevealStage}
      />
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

  it("renders image-only options without text on results stage", () => {
    expect(() =>
      renderChart({
        questionId: "img",
        text: "Pick image",
        type: "single",
        optionStats: [
          {
            optionId: "o1",
            text: undefined,
            imageUrl: "/media/a.png",
            count: 2,
            isCorrect: false,
          },
          {
            optionId: "o2",
            text: undefined,
            imageUrl: "/media/b.png",
            count: 1,
            isCorrect: true,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("renders image-only options on options reveal stage", () => {
    expect(() =>
      renderChart(
        {
          questionId: "img-opts",
          text: "Pick image",
          type: "single",
          optionStats: [
            {
              optionId: "o1",
              text: undefined,
              imageUrl: "/media/a.png",
              count: 0,
              isCorrect: false,
            },
            {
              optionId: "o2",
              text: undefined,
              imageUrl: "/media/b.png",
              count: 0,
              isCorrect: false,
            },
          ],
        },
        { questionRevealStage: "options" },
      ),
    ).not.toThrow();
  });

  it("renders debate side-by-side with missing option text", () => {
    expect(() =>
      renderChart({
        questionId: "debate",
        text: "Тезис",
        type: "single",
        projectorDebateLayout: true,
        optionStats: [
          { optionId: "a", text: undefined, imageUrl: "/a.png", count: 10, isCorrect: false },
          { optionId: "b", text: undefined, imageUrl: "/b.png", count: 5, isCorrect: false },
        ],
      }),
    ).not.toThrow();
  });
});
