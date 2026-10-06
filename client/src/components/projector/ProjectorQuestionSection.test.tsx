// @vitest-environment jsdom

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { formatDebateSeriesRoundLabel, ProjectorQuestionSection } from "./ProjectorQuestionSection";

const theme = createTheme();

const cumulativeQuestion: ProjectorQuestionResult = {
  questionId: "r0",
  text: "Накопительный итог",
  type: "single",
  projectorDebateLayout: true,
  debateSeriesId: "ser1",
  optionStats: [
    { optionId: "a", text: "ЕР", count: 30, isCorrect: false, color: "#1976d2" },
    { optionId: "b", text: "КПРФ", count: 20, isCorrect: false, color: "#c62828" },
  ],
};

const roundQuestions: ProjectorQuestionResult[] = [
  {
    questionId: "r0",
    text: "Тезис",
    type: "single",
    projectorDebateLayout: true,
    debateSeriesId: "ser1",
    debateRoundIndex: 0,
    optionStats: [
      { optionId: "a0", text: "ЕР", count: 10, isCorrect: false, color: "#1976d2" },
      { optionId: "b0", text: "КПРФ", count: 0, isCorrect: false, color: "#c62828" },
    ],
  },
  {
    questionId: "r1",
    text: "Тезис",
    type: "single",
    projectorDebateLayout: true,
    debateSeriesId: "ser1",
    debateRoundIndex: 1,
    optionStats: [
      { optionId: "a1", text: "ЕР", count: 5, isCorrect: false, color: "#1976d2" },
      { optionId: "b1", text: "КПРФ", count: 5, isCorrect: false, color: "#c62828" },
    ],
  },
  {
    questionId: "r2",
    text: "Тезис",
    type: "single",
    projectorDebateLayout: true,
    debateSeriesId: "ser1",
    debateRoundIndex: 2,
    optionStats: [
      { optionId: "a2", text: "ЕР", count: 0, isCorrect: false, color: "#1976d2" },
      { optionId: "b2", text: "КПРФ", count: 8, isCorrect: false, color: "#c62828" },
    ],
  },
];

describe("formatDebateSeriesRoundLabel", () => {
  it("uses debateRoundIndex when present", () => {
    expect(formatDebateSeriesRoundLabel({ debateRoundIndex: 0 }, 9)).toBe("Раунд 1");
    expect(formatDebateSeriesRoundLabel({ debateRoundIndex: 2 }, 0)).toBe("Раунд 3");
  });

  it("falls back to list index when debateRoundIndex is missing", () => {
    expect(formatDebateSeriesRoundLabel({}, 0)).toBe("Раунд 1");
    expect(formatDebateSeriesRoundLabel({}, 4)).toBe("Раунд 5");
  });
});

describe("ProjectorQuestionSection debate series round bars", () => {
  it("renders a round label to the left of each compact bar", () => {
    render(
      <ThemeProvider theme={theme}>
        <ProjectorQuestionSection
          selectedQuestion={cumulativeQuestion}
          view={{
            ...DEFAULT_PUBLIC_VIEW_STATE,
            mode: "debate_series",
            debateSeriesId: "ser1",
            debateSeriesView: "cumulative",
            debateSeriesShowRounds: true,
            questionId: "r0",
            questionRevealStage: "results",
          }}
          showProjectorWinnersHero={false}
          fullScreenCloud={false}
          isTagCloudQuestion={false}
          firstCorrectWinnersShown={[]}
          debateSeriesRounds={roundQuestions}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Раунд 1")).toBeTruthy();
    expect(screen.getByText("Раунд 2")).toBeTruthy();
    expect(screen.getByText("Раунд 3")).toBeTruthy();
  });

  it("does not crash when question and options have no text", () => {
    expect(() =>
      render(
        <ThemeProvider theme={theme}>
          <ProjectorQuestionSection
            selectedQuestion={{
              questionId: "img",
              text: undefined as unknown as string,
              imageUrl: "/q.png",
              type: "single",
              optionStats: [
                {
                  optionId: "o1",
                  text: undefined,
                  imageUrl: "/a.png",
                  count: 3,
                  isCorrect: false,
                },
                {
                  optionId: "o2",
                  text: undefined,
                  imageUrl: "/b.png",
                  count: 1,
                  isCorrect: true,
                },
              ],
            }}
            view={{
              ...DEFAULT_PUBLIC_VIEW_STATE,
              mode: "question",
              questionId: "img",
              questionRevealStage: "results",
            }}
            showProjectorWinnersHero={false}
            fullScreenCloud={false}
            isTagCloudQuestion={false}
            firstCorrectWinnersShown={[]}
          />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it("does not render round labels when rounds list is empty", () => {
    render(
      <ThemeProvider theme={theme}>
        <ProjectorQuestionSection
          selectedQuestion={cumulativeQuestion}
          view={{
            ...DEFAULT_PUBLIC_VIEW_STATE,
            mode: "debate_series",
            debateSeriesId: "ser1",
            debateSeriesView: "cumulative",
            debateSeriesShowRounds: false,
            questionId: "r0",
            questionRevealStage: "results",
          }}
          showProjectorWinnersHero={false}
          fullScreenCloud={false}
          isTagCloudQuestion={false}
          firstCorrectWinnersShown={[]}
          debateSeriesRounds={[]}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText("Раунд 1")).toBeNull();
  });
});
