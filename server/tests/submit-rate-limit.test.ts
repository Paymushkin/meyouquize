import { afterEach, describe, expect, it, vi } from "vitest";
import { allowAnswerSubmit, clearSubmitRateLimit } from "../src/socket/submit-rate-limit.js";

describe("submit-rate-limit", () => {
  afterEach(() => {
    clearSubmitRateLimit("socket-1");
    vi.useRealTimers();
  });

  it("allows submits under the limit", () => {
    for (let i = 0; i < 40; i += 1) {
      expect(allowAnswerSubmit("socket-1")).toBe(true);
    }
    expect(allowAnswerSubmit("socket-1")).toBe(false);
  });

  it("resets bucket after window", () => {
    vi.useFakeTimers();
    expect(allowAnswerSubmit("socket-1")).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(allowAnswerSubmit("socket-1")).toBe(true);
  });

  it("clearSubmitRateLimit resets counter", () => {
    for (let i = 0; i < 40; i += 1) {
      allowAnswerSubmit("socket-1");
    }
    clearSubmitRateLimit("socket-1");
    expect(allowAnswerSubmit("socket-1")).toBe(true);
  });
});
