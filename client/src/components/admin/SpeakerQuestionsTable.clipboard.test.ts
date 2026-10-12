import { describe, expect, it } from "vitest";
import { SPEAKER_ALL_TARGET, SPEAKER_NOT_SELECTED } from "@meyouquize/shared";
import { buildSpeakerQuestionClipboardText } from "./SpeakerQuestionsTable";

describe("buildSpeakerQuestionClipboardText", () => {
  it("formats recipient and question text", () => {
    expect(buildSpeakerQuestionClipboardText("Дмитрий Иванов", "Какой прогноз?")).toBe(
      "Кому: Дмитрий Иванов\nКакой прогноз?",
    );
  });

  it("uses display labels for special targets", () => {
    expect(buildSpeakerQuestionClipboardText(SPEAKER_ALL_TARGET, "Вопрос всем")).toBe(
      "Кому: Все спикеры\nВопрос всем",
    );
    expect(buildSpeakerQuestionClipboardText(SPEAKER_NOT_SELECTED, "Без адресата")).toBe(
      "Кому: Не выбрано\nБез адресата",
    );
  });
});
