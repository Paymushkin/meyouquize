import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_NETWORKING_REDIS_PREFIX,
  EXPERIMENT_TIMELINE_REDIS_PREFIX,
  networkingPresenceMemberKey,
  timelineLockKey,
} from "../src/experiment-redis-keys.js";

describe("experiment redis key prefixes", () => {
  it("keeps timeline and networking under isolated prefixes", () => {
    expect(EXPERIMENT_TIMELINE_REDIS_PREFIX).toBe("mq:timeline:");
    expect(EXPERIMENT_NETWORKING_REDIS_PREFIX).toBe("mq:networking:");
    expect(timelineLockKey("q1")).toBe("mq:timeline:q1:lock");
    expect(networkingPresenceMemberKey("q1", "p1")).toBe("mq:networking:q1:presence:p1");
    expect(timelineLockKey("q1").startsWith(EXPERIMENT_TIMELINE_REDIS_PREFIX)).toBe(true);
    expect(
      networkingPresenceMemberKey("q1", "p1").startsWith(EXPERIMENT_NETWORKING_REDIS_PREFIX),
    ).toBe(true);
  });
});
