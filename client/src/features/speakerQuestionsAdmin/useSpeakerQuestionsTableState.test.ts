// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import { useSpeakerQuestionsTableState } from "./useSpeakerQuestionsTableState";

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

describe("useSpeakerQuestionsTableState", () => {
  it("по умолчанию сортирует по рейтингу по убыванию", () => {
    const rows = [
      makeItem({ id: "low", reactionCounts: { "👍": 1 } }),
      makeItem({ id: "high", reactionCounts: { "🔥": 4, "👏": 1 } }),
      makeItem({ id: "mid", reactionCounts: { "❤️": 2 } }),
    ];
    const { result } = renderHook(() => useSpeakerQuestionsTableState(rows));
    expect(result.current.sortedRows.map((x) => x.id)).toEqual(["high", "mid", "low"]);
  });

  it("обновляет сортировку через setSort", () => {
    const rows = [
      makeItem({ id: "b", authorNickname: "Борис" }),
      makeItem({ id: "a", authorNickname: "Анна" }),
    ];
    const { result } = renderHook(() => useSpeakerQuestionsTableState(rows));

    act(() => {
      result.current.setSort({ key: "author", dir: "asc" });
    });

    expect(result.current.sortedRows.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("работает с черновиком и разрешает сохранение только валидного изменения", () => {
    const row = makeItem({ id: "q1", text: "Исходный текст" });
    const { result } = renderHook(() => useSpeakerQuestionsTableState([row]));

    expect(result.current.getDraftValue(row)).toBe("Исходный текст");
    expect(result.current.canSaveDraft(row)).toBe(false);

    act(() => {
      result.current.setDraftValue("q1", "  новый вопрос  ");
    });

    expect(result.current.getDraftValue(row)).toBe("  новый вопрос  ");
    expect(result.current.getTrimmedDraft(row)).toBe("новый вопрос");
    expect(result.current.canSaveDraft(row)).toBe(true);
  });

  it("не дает сохранить слишком короткий текст", () => {
    const row = makeItem({ id: "q2", text: "Нормальный текст" });
    const { result } = renderHook(() => useSpeakerQuestionsTableState([row]));

    act(() => {
      result.current.setDraftValue("q2", " x ");
    });

    expect(result.current.getTrimmedDraft(row)).toBe("x");
    expect(result.current.canSaveDraft(row)).toBe(false);
  });
});
