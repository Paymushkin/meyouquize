import { describe, expect, it } from "vitest";
import { SPEAKER_ALL_TARGET, SPEAKER_NOT_SELECTED } from "@meyouquize/shared";
import {
  SPEAKER_UI_UNSELECTED,
  normalizeSpeakerUiSelection,
  resolveSpeakerNameForCreate,
  speakerQuestionRecipientLabel,
  speakerQuestionRecipientLabelForAudience,
} from "./speakerTargetUi";

describe("speakerTargetUi", () => {
  it("resolves create payload with optional speaker", () => {
    expect(resolveSpeakerNameForCreate("", true)).toBe(SPEAKER_ALL_TARGET);
    expect(resolveSpeakerNameForCreate("Иванов", true)).toBe("Иванов");
    expect(resolveSpeakerNameForCreate("", false)).toBe(SPEAKER_NOT_SELECTED);
    expect(resolveSpeakerNameForCreate("Иванов", false)).toBe("Иванов");
  });

  it("normalizes ui selection when all-speakers option is disabled", () => {
    const speakers = ["Иванов"];
    expect(normalizeSpeakerUiSelection(SPEAKER_ALL_TARGET, false, speakers)).toBe(
      SPEAKER_UI_UNSELECTED,
    );
    expect(normalizeSpeakerUiSelection("Иванов", false, speakers)).toBe("Иванов");
    expect(normalizeSpeakerUiSelection("Петров", false, speakers)).toBe(SPEAKER_UI_UNSELECTED);
  });

  it("hides recipient label for audience when not selected", () => {
    expect(speakerQuestionRecipientLabelForAudience(SPEAKER_NOT_SELECTED)).toBeNull();
    expect(speakerQuestionRecipientLabelForAudience("Иванов")).toBe("Для: Иванов");
    expect(speakerQuestionRecipientLabel(SPEAKER_NOT_SELECTED)).toBe("Для: не выбрано");
  });
});
