import { describe, expect, it } from "vitest";
import { nextDir, sortRows, type SortState } from "./speakerQuestionsSort";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

function makeItem(overrides: Partial<SpeakerQuestionItem>): SpeakerQuestionItem {
  return {
    id: "id",
    speakerName: "Все спикеры",
    text: "Тестовый вопрос",
    authorNickname: "Автор",
    status: "PENDING",
    userVisible: true,
    isOnScreen: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("speakerQuestionsSort", () => {
  it("nextDir переключает направление сортировки", () => {
    expect(nextDir(false, "desc")).toBe("asc");
    expect(nextDir(true, "asc")).toBe("desc");
    expect(nextDir(true, "desc")).toBe("asc");
  });

  it("сортирует по общему количеству реакций", () => {
    const rows = [
      makeItem({ id: "a", reactionCounts: { "👍": 2, "🔥": 1 } }), // 3
      makeItem({ id: "b", reactionCounts: { "👍": 1 } }), // 1
      makeItem({ id: "c", reactionCounts: { "👍": 4, "👏": 2 } }), // 6
    ];

    const sort: SortState<"rating"> = { key: "rating", dir: "desc" };
    const result = sortRows(rows, sort);
    expect(result.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("сортирует по флагу UI", () => {
    const rows = [
      makeItem({ id: "a", userVisible: true }),
      makeItem({ id: "b", userVisible: false }),
      makeItem({ id: "c", userVisible: true }),
    ];

    const asc = sortRows(rows, { key: "ui", dir: "asc" });
    expect(asc.map((x) => x.id)).toEqual(["b", "a", "c"]);

    const desc = sortRows(rows, { key: "ui", dir: "desc" });
    expect(desc.map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("сортирует по тексту вопроса", () => {
    const rows = [
      makeItem({ id: "b", text: "Яблоко" }),
      makeItem({ id: "a", text: "Арбуз" }),
      makeItem({ id: "v", text: "Вишня" }),
    ];

    const result = sortRows(rows, { key: "question", dir: "asc" });
    expect(result.map((x) => x.id)).toEqual(["a", "v", "b"]);
  });
});
