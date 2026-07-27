import { describe, expect, it } from "vitest";
import { projectorDashboardFingerprint } from "./projectorDashboardFingerprint";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { initialProjectorSessionState, projectorSessionReducer } from "./projectorSessionReducer";

function rankingQuestion(
  metric: NonNullable<ProjectorQuestionResult["rankingProjectorMetric"]>,
): ProjectorQuestionResult {
  return {
    questionId: "q-rank",
    type: "ranking",
    rankingProjectorMetric: metric,
    optionStats: [
      { optionId: "o1", text: "A", count: 0, isCorrect: false, avgRank: 1.5, totalScore: 10 },
      { optionId: "o2", text: "B", count: 0, isCorrect: false, avgRank: 2.5, totalScore: 4 },
    ],
  };
}

describe("projectorDashboardFingerprint", () => {
  it("changes when rankingProjectorMetric changes", () => {
    const a = projectorDashboardFingerprint([rankingQuestion("avg_score")], [], []);
    const b = projectorDashboardFingerprint([rankingQuestion("total_score")], [], []);
    expect(a).not.toBe(b);
  });
});

describe("projectorSessionReducer dashboard", () => {
  it("applies rankingProjectorMetric update from results:dashboard", () => {
    const state = {
      ...initialProjectorSessionState,
      questions: [rankingQuestion("avg_score")],
    };
    const next = projectorSessionReducer(state, {
      type: "dashboard",
      perQuestion: [rankingQuestion("total_score")],
      leaderboard: [],
      leaderboardsBySubQuiz: [],
    });
    expect(next).not.toBe(state);
    expect(next.questions[0]?.rankingProjectorMetric).toBe("total_score");
  });
});
