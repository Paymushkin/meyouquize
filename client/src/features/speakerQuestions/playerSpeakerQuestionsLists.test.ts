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
  it("filters actual to user-visible non-rejected in active session", () => {
    const items = [
      item({ id: "1", status: "APPROVED", userVisible: true, sessionId: "s1" }),
      item({ id: "2", status: "APPROVED", userVisible: true, sessionId: "s2" }),
      item({ id: "3", status: "PENDING", userVisible: false, sessionId: "s1", isMine: true }),
      item({ id: "4", status: "REJECTED", userVisible: true, sessionId: "s1" }),
      item({ id: "5", status: "APPROVED", userVisible: true, sessionId: null }),
    ];
    expect(filterActualSpeakerQuestions(items, "s1").map((q) => q.id)).toEqual(["1"]);
  });

  it("without active session keeps all user-visible non-rejected", () => {
    const items = [
      item({ id: "1", status: "PENDING", userVisible: true }),
      item({ id: "2", status: "APPROVED", userVisible: true }),
      item({ id: "3", status: "PENDING", userVisible: false, isMine: true }),
      item({ id: "4", status: "REJECTED", userVisible: true }),
    ];
    expect(filterActualSpeakerQuestions(items).map((q) => q.id)).toEqual(["1", "2"]);
    expect(filterActualSpeakerQuestions(items, null).map((q) => q.id)).toEqual(["1", "2"]);
  });

  it("filters my questions by isMine across sessions", () => {
    const items = [
      item({ id: "1", isMine: true, sessionId: "s1" }),
      item({ id: "2", isMine: false, sessionId: "s1" }),
      item({ id: "3", isMine: true, sessionId: "s2" }),
    ];
    expect(filterMySpeakerQuestions(items).map((q) => q.id)).toEqual(["1", "3"]);
  });

  it("keeps not-selected speaker questions in player lists", () => {
    const items = [
      item({
        id: "1",
        speakerName: "не выбрано",
        userVisible: true,
        isMine: true,
        sessionId: "s1",
      }),
      item({ id: "2", speakerName: "Иванов", userVisible: true, sessionId: "s1" }),
    ];
    expect(filterActualSpeakerQuestions(items, "s1").map((q) => q.id)).toEqual(["1", "2"]);
    expect(filterMySpeakerQuestions(items).map((q) => q.id)).toEqual(["1"]);
  });
});
