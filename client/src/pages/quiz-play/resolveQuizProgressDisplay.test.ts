import { describe, expect, it } from "vitest";
import {
  isRoomMultiActiveFlow,
  isSubQuizAutoFlow,
  resolveQuizProgressForQuestion,
} from "./resolveQuizProgressDisplay";

describe("resolveQuizProgressDisplay", () => {
  const baseProgress = {
    subQuizId: "sq1",
    questionFlowMode: "manual" as const,
    index: 1,
    total: 10,
    orderedQuestionIds: ["q1", "q2", "q3"],
  };

  it("uses orderedQuestionIds for manual sub-quiz", () => {
    const out = resolveQuizProgressForQuestion(baseProgress, "q3", null);
    expect(out?.index).toBe(3);
    expect(out?.total).toBe(3);
  });

  it("does not treat multiple active as auto when quizProgress is manual", () => {
    expect(isSubQuizAutoFlow({ ...baseProgress, questionFlowMode: "manual" })).toBe(false);
    expect(isRoomMultiActiveFlow({ ...baseProgress, questionFlowMode: "manual" }, 3)).toBe(false);
  });

  it("uses stepIndex on activeQuestion when order list is missing", () => {
    const progress = { ...baseProgress, orderedQuestionIds: undefined as unknown as string[] };
    const out = resolveQuizProgressForQuestion(progress, "q2", {
      id: "q2",
      text: "t",
      type: "single",
      options: [],
      isClosed: false,
      stepIndex: 2,
      stepTotal: 10,
    });
    expect(out?.index).toBe(2);
    expect(out?.total).toBe(10);
  });
});
