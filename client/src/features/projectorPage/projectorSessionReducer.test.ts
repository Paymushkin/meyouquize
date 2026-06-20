import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { describe, expect, it } from "vitest";
import { projectorSessionReducer, initialProjectorSessionState } from "./projectorSessionReducer";

describe("projectorSessionReducer", () => {
  it("updates dashboard payload", () => {
    const next = projectorSessionReducer(initialProjectorSessionState, {
      type: "dashboard",
      perQuestion: [
        {
          questionId: "q1",
          text: "Q?",
          optionStats: [],
        },
      ],
      leaderboard: [{ participantId: "p1", nickname: "Ann", score: 3, totalResponseMs: 100 }],
      leaderboardsBySubQuiz: [],
    });
    expect(next.questions).toHaveLength(1);
    expect(next.leaders[0]?.nickname).toBe("Ann");
  });

  it("merges public view and title", () => {
    const next = projectorSessionReducer(initialProjectorSessionState, {
      type: "publicView",
      payload: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "q1",
        title: "  Event  ",
      },
    });
    expect(next.view.mode).toBe("question");
    expect(next.view.questionId).toBe("q1");
    expect(next.quizTitle).toBe("Event");
  });

  it("bumps leaderboard animation tick", () => {
    const next = projectorSessionReducer(initialProjectorSessionState, {
      type: "bumpLeaderboardAnim",
    });
    expect(next.resultsAnimationTick).toBe(1);
  });
});
