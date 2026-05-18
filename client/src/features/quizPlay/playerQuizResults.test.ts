import { describe, expect, it } from "vitest";
import { resolveEnabledQuizReportSubQuizIds } from "./playerQuizResults";

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
