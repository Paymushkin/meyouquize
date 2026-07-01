import { describe, expect, it } from "vitest";
import {
  filterActualSpeakerQuestions,
  filterMySpeakerQuestions,
} from "./playerSpeakerQuestionsLists";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

function item(
  partial: Partial<SpeakerQuestionItem> & Pick<SpeakerQuestionItem, "id">,
): SpeakerQuestionItem {
  return {
    speakerName: "Иванов",
    text: "Вопрос?",
    authorNickname: "Анна",
    status: "PENDING",
    userVisible: false,
    isOnScreen: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("playerSpeakerQuestionsLists", () => {
  it("filters actual user-visible non-rejected questions", () => {
    const items = [
      item({ id: "1", status: "PENDING", userVisible: true }),
      item({ id: "2", status: "APPROVED", userVisible: true }),
      item({ id: "3", status: "PENDING", userVisible: false, isMine: true }),
      item({ id: "4", status: "REJECTED", userVisible: true }),
    ];
    expect(filterActualSpeakerQuestions(items).map((q) => q.id)).toEqual(["1", "2"]);
  });

  it("filters my questions by isMine", () => {
    const items = [
      item({ id: "1", isMine: true }),
      item({ id: "2", isMine: false }),
      item({ id: "3", isMine: true }),
    ];
    expect(filterMySpeakerQuestions(items).map((q) => q.id)).toEqual(["1", "3"]);
  });

  it("keeps not-selected speaker questions in player lists", () => {
    const items = [
      item({ id: "1", speakerName: "не выбрано", userVisible: true, isMine: true }),
      item({ id: "2", speakerName: "Иванов", userVisible: true }),
    ];
    expect(filterActualSpeakerQuestions(items).map((q) => q.id)).toEqual(["1", "2"]);
    expect(filterMySpeakerQuestions(items).map((q) => q.id)).toEqual(["1"]);
  });
});
