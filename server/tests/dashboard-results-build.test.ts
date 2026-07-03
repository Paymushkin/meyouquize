import { describe, expect, it } from "vitest";
import { debounceTokenTtlMs } from "../src/dashboard-results-cache.js";
import {
  attachAnswersToQuestions,
  groupAnswersByQuestionId,
  isDashboardDebounceTokenCurrent,
} from "../src/dashboard-results-build.js";

describe("groupAnswersByQuestionId", () => {
  it("groups flat answer rows by questionId", () => {
    const grouped = groupAnswersByQuestionId([
      { questionId: "q1", selectedOptionIds: '["a"]' },
      { questionId: "q2", selectedOptionIds: '["b"]' },
      { questionId: "q1", selectedOptionIds: '["c"]' },
    ]);

    expect(grouped.get("q1")).toEqual([
      { selectedOptionIds: '["a"]' },
      { selectedOptionIds: '["c"]' },
    ]);
    expect(grouped.get("q2")).toEqual([{ selectedOptionIds: '["b"]' }]);
    expect(grouped.get("missing")).toBeUndefined();
  });
});

describe("attachAnswersToQuestions", () => {
  it("attaches grouped answers to question rows", () => {
    const grouped = groupAnswersByQuestionId([{ questionId: "q1", selectedOptionIds: '["x"]' }]);
    const rows = attachAnswersToQuestions([{ id: "q1", text: "Q" }], grouped);
    expect(rows[0]?.answers).toEqual([{ selectedOptionIds: '["x"]' }]);
  });
});

describe("debounceTokenTtlMs", () => {
  it("outlives debounce window so Redis token is still readable when timer fires", () => {
    expect(debounceTokenTtlMs(600)).toBeGreaterThan(600);
    expect(debounceTokenTtlMs(250)).toBeGreaterThanOrEqual(5_250);
  });
});

describe("isDashboardDebounceTokenCurrent", () => {
  it("matches only the latest debounce token", () => {
    expect(isDashboardDebounceTokenCurrent("t1", "t1")).toBe(true);
    expect(isDashboardDebounceTokenCurrent("t1", "t2")).toBe(false);
    expect(isDashboardDebounceTokenCurrent("t1", null)).toBe(false);
  });
});
