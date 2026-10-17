import { describe, expect, it } from "vitest";
import { debounceTokenTtlMs } from "../src/dashboard-results-cache.js";
import {
  attachAnswersToQuestions,
  dashboardBroadcastDelayMs,
  groupAnswersByQuestionId,
  isDashboardDebounceTokenCurrent,
  shouldFlushDashboardForMaxWait,
  shouldHonorRedisDebounceToken,
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

describe("dashboardBroadcastDelayMs", () => {
  it("uses trailing debounce at the start of a burst", () => {
    expect(dashboardBroadcastDelayMs(220, 2000, 0)).toBe(220);
  });

  it("keeps debounce until maxWait is close", () => {
    expect(dashboardBroadcastDelayMs(220, 2000, 1500)).toBe(220);
    expect(dashboardBroadcastDelayMs(220, 2000, 1900)).toBe(100);
  });

  it("forces an emit when the burst has lasted maxWait", () => {
    expect(dashboardBroadcastDelayMs(220, 2000, 2000)).toBe(0);
    expect(dashboardBroadcastDelayMs(220, 2000, 5000)).toBe(0);
  });

  it("disables maxWait when set to 0", () => {
    expect(dashboardBroadcastDelayMs(220, 0, 5000)).toBe(220);
  });
});

describe("shouldFlushDashboardForMaxWait", () => {
  it("flushes after maxWait even if no emit has happened yet", () => {
    expect(shouldFlushDashboardForMaxWait(2000, 0)).toBe(false);
    expect(shouldFlushDashboardForMaxWait(2000, 1999)).toBe(false);
    expect(shouldFlushDashboardForMaxWait(2000, 2000)).toBe(true);
  });

  it("does not flush when maxWait is disabled", () => {
    expect(shouldFlushDashboardForMaxWait(0, 10_000)).toBe(false);
  });
});

describe("shouldHonorRedisDebounceToken", () => {
  it("does not let Redis cancel a max-wait flush", () => {
    expect(shouldHonorRedisDebounceToken(true)).toBe(false);
    expect(shouldHonorRedisDebounceToken(false)).toBe(true);
  });
});
