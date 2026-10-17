import { beforeEach, describe, expect, it } from "vitest";
import {
  readModeratorAnsweredIds,
  sortModeratorQuestionsByAnswered,
  writeModeratorAnsweredIds,
} from "./moderatorAnsweredQuestions";

describe("moderatorAnsweredQuestions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists answered ids by scope", () => {
    writeModeratorAnsweredIds("demo", ["a", "b"]);
    expect(readModeratorAnsweredIds("demo")).toEqual(["a", "b"]);
    expect(readModeratorAnsweredIds("other")).toEqual([]);
  });

  it("moves answered items to the end keeping relative order", () => {
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];
    expect(sortModeratorQuestionsByAnswered(items, new Set(["2", "4"]))).toEqual([
      { id: "1" },
      { id: "3" },
      { id: "2" },
      { id: "4" },
    ]);
  });
});
