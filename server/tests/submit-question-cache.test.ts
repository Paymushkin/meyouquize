import { describe, expect, it } from "vitest";
import {
  getCachedSubmitQuestion,
  invalidateSubmitQuestionCacheForQuiz,
  setCachedSubmitQuestion,
  type SubmitQuestionRow,
} from "../src/submit-question-cache.js";

function makeQuestion(id: string): SubmitQuestionRow {
  return {
    id,
    options: [],
  } as unknown as SubmitQuestionRow;
}

describe("submit question cache", () => {
  it("invalidates only one quiz cache in O(1) structure", () => {
    invalidateSubmitQuestionCacheForQuiz("quiz-a");
    invalidateSubmitQuestionCacheForQuiz("quiz-b");

    const questionA = makeQuestion("q-a");
    const questionB = makeQuestion("q-b");

    setCachedSubmitQuestion("quiz-a", "q-a", questionA);
    setCachedSubmitQuestion("quiz-b", "q-b", questionB);

    expect(getCachedSubmitQuestion("quiz-a", "q-a")).toBe(questionA);
    expect(getCachedSubmitQuestion("quiz-b", "q-b")).toBe(questionB);

    invalidateSubmitQuestionCacheForQuiz("quiz-a");

    expect(getCachedSubmitQuestion("quiz-a", "q-a")).toBeNull();
    expect(getCachedSubmitQuestion("quiz-b", "q-b")).toBe(questionB);

    invalidateSubmitQuestionCacheForQuiz("quiz-b");
  });
});
