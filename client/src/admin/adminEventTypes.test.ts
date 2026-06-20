import { describe, expect, it } from "vitest";
import { leaderboardPlaceByScore } from "./adminEventTypes.js";

describe("leaderboardPlaceByScore", () => {
  it("assigns places by score desc then nickname", () => {
    const map = leaderboardPlaceByScore([
      { participantId: "a", nickname: "Борис", score: 10 },
      { participantId: "b", nickname: "Алиса", score: 10 },
      { participantId: "c", nickname: "София", score: 5 },
    ]);
    expect(map.get("b")).toBe(1);
    expect(map.get("a")).toBe(2);
    expect(map.get("c")).toBe(3);
  });
});
