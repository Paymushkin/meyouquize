import { describe, expect, it } from "vitest";
import {
  resolveEnabledQuizReportSubQuizIds,
  resolveQuizResultsTileTitle,
} from "./playerQuizResults";

describe("resolveEnabledQuizReportSubQuizIds", () => {
  const subQuizzes = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
  ];

  it("uses explicit array when provided", () => {
    expect(
      resolveEnabledQuizReportSubQuizIds({
        subQuizIds: ["b", "a"],
        subQuizzes,
      }),
    ).toEqual(["b", "a"]);
  });

  it("migrates legacy single visible report", () => {
    expect(
      resolveEnabledQuizReportSubQuizIds({
        legacyVisible: true,
        legacySubQuizId: "b",
        subQuizzes,
      }),
    ).toEqual(["b"]);
  });

  it("allows multiple legacy-free ids", () => {
    expect(
      resolveEnabledQuizReportSubQuizIds({
        subQuizIds: ["a", "b"],
        subQuizzes,
      }),
    ).toEqual(["a", "b"]);
  });
});

describe("resolveQuizResultsTileTitle", () => {
  const subQuizzes = [
    { id: "a", title: "Квиз A" },
    { id: "b", title: "" },
  ];

  it("uses subQuiz title when set", () => {
    expect(resolveQuizResultsTileTitle("Мой квиз", subQuizzes, "a")).toBe("Квиз A");
  });

  it("returns empty string when subQuiz title is empty", () => {
    expect(resolveQuizResultsTileTitle("Мой квиз", subQuizzes, "b")).toBe("");
  });

  it("falls back to caption when subQuiz is unknown", () => {
    expect(resolveQuizResultsTileTitle("Мой квиз", subQuizzes, "missing")).toBe("Мой квиз");
  });
});
