import { describe, expect, it } from "vitest";
import { allowSocketAction, clearSocketActionRateLimits } from "../src/socket/action-rate-limit.js";

describe("action rate limit helper", () => {
  it("allows up to maxPerWindow actions", () => {
    clearSocketActionRateLimits("s1");
    const windowMs = 60_000;
    const maxPerWindow = 2;
    expect(allowSocketAction({ socketId: "s1", action: "a", windowMs, maxPerWindow })).toBe(true);
    expect(allowSocketAction({ socketId: "s1", action: "a", windowMs, maxPerWindow })).toBe(true);
    expect(allowSocketAction({ socketId: "s1", action: "a", windowMs, maxPerWindow })).toBe(false);
  });
});
