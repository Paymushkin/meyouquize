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
    moderatorVisible: false,
    isOnScreen: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useSpeakerQuestionsTableState", () => {
  it("по умолчанию сортирует по дате поступления: новые сверху", () => {
    const rows = [
      makeItem({ id: "old", createdAt: "2026-01-01T10:00:00.000Z" }),
      makeItem({ id: "new", createdAt: "2026-01-02T12:00:00.000Z" }),
      makeItem({ id: "mid", createdAt: "2026-01-01T18:00:00.000Z" }),
    ];
    const { result } = renderHook(() => useSpeakerQuestionsTableState(rows));
    expect(result.current.sortedRows.map((x) => x.id)).toEqual(["new", "mid", "old"]);
  });

  it("назначает стабильный порядковый номер: новый вопрос — последний", () => {
    const rows = [
      makeItem({ id: "old", createdAt: "2026-01-01T10:00:00.000Z" }),
      makeItem({ id: "new", createdAt: "2026-01-02T12:00:00.000Z" }),
      makeItem({ id: "mid", createdAt: "2026-01-01T18:00:00.000Z" }),
    ];
    const { result } = renderHook(() => useSpeakerQuestionsTableState(rows));
    expect(result.current.sortedRows.map((x) => x.id)).toEqual(["new", "mid", "old"]);
    expect(result.current.sequenceById.get("old")).toBe(1);
    expect(result.current.sequenceById.get("mid")).toBe(2);
    expect(result.current.sequenceById.get("new")).toBe(3);
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
