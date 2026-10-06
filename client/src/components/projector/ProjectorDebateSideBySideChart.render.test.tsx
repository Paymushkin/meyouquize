// @vitest-environment jsdom

import { alpha, createTheme, ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectorDebateSideBySideChart } from "./ProjectorDebateSideBySideChart";

const theme = createTheme();

function emotionBackgroundColor(element: Element): string {
  const className = [...element.classList].find((name) => name.startsWith("css-"));
  if (!className) return "";
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      if (!rule.selectorText.includes(className)) continue;
      const value = rule.style.backgroundColor;
      if (value) return value;
    }
  }
  return "";
}

function renderZeroResultsChart() {
  return render(
    <ThemeProvider theme={theme}>
      <ProjectorDebateSideBySideChart
        rows={[
          {
            optionId: "er",
            text: "ЕР",
            color: "#4caf50",
            percent: 0,
            percentLabel: "0%",
          },
          {
            optionId: "kprf",
            text: "КПРФ",
            color: "#c62828",
            percent: 0,
            percentLabel: "0%",
          },
          {
            optionId: "ldpr",
            text: "ЛДПР",
            color: "#111111",
            percent: 0,
            percentLabel: "0%",
          },
        ]}
        questionRevealStage="results"
        voteOptionTextColor="#ffffff"
        voteOptionBorderColor="#ffffff"
        voteProgressTrackColor="#333333"
        voteProgressBarColor="#ffffff"
      />
    </ThemeProvider>,
  );
}

describe("ProjectorDebateSideBySideChart zero results", () => {
  it("renders 0% labels for every party", () => {
    renderZeroResultsChart();
    expect(screen.getAllByText("0%")).toHaveLength(3);
    expect(screen.getByText("ЕР")).toBeTruthy();
    expect(screen.getByText("КПРФ")).toBeTruthy();
    expect(screen.getByText("ЛДПР")).toBeTruthy();
  });

  it("keeps opaque party fills instead of fading them", () => {
    renderZeroResultsChart();
    const scale = screen.getByRole("img", { name: "Шкала распределения голосов по позициям" });
    const segments = [...scale.children];
    expect(segments).toHaveLength(3);

    const fills = segments.map((segment) => emotionBackgroundColor(segment));
    expect(fills).toEqual(["rgb(76, 175, 80)", "rgb(198, 40, 40)", "rgb(17, 17, 17)"]);

    expect(fills).not.toContain(alpha("#4caf50", 0.28));
    expect(fills.every((fill) => !fill.startsWith("rgba("))).toBe(true);
  });
});

describe("ProjectorDebateSideBySideChart image-only options", () => {
  it("renders without crashing when option text is missing", () => {
    expect(() =>
      render(
        <ThemeProvider theme={theme}>
          <ProjectorDebateSideBySideChart
            rows={[
              {
                optionId: "a",
                text: undefined as unknown as string,
                imageUrl: "/a.png",
                color: "#1976d2",
                percent: 60,
                percentLabel: "60%",
              },
              {
                optionId: "b",
                text: "",
                imageUrl: "/b.png",
                color: "#c62828",
                percent: 40,
                percentLabel: "40%",
              },
            ]}
            questionRevealStage="results"
            voteOptionTextColor="#ffffff"
            voteOptionBorderColor="#ffffff"
            voteProgressTrackColor="#333333"
            voteProgressBarColor="#ffffff"
          />
        </ThemeProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });
});
