import { describe, expect, it } from "vitest";
import {
  SPEAKER_ALL_TARGET,
  SPEAKER_NOT_SELECTED,
  isKnownSpeakerTargetValue,
  isSpeakerRecipientHiddenFromAudience,
  shouldShowSpeakerRecipientToAudience,
} from "./speakerQuestionTargets.js";

describe("speakerQuestionTargets", () => {
  it("recognizes built-in and list speaker values", () => {
    const speakers = ["Иванов"];
    expect(isKnownSpeakerTargetValue(SPEAKER_ALL_TARGET, speakers)).toBe(true);
    expect(isKnownSpeakerTargetValue(SPEAKER_NOT_SELECTED, speakers)).toBe(true);
    expect(isKnownSpeakerTargetValue("Иванов", speakers)).toBe(true);
    expect(isKnownSpeakerTargetValue("Петров", speakers)).toBe(false);
    expect(isKnownSpeakerTargetValue("", speakers)).toBe(false);
  });

  it("marks not-selected as hidden from audience", () => {
    expect(isSpeakerRecipientHiddenFromAudience(SPEAKER_NOT_SELECTED)).toBe(true);
    expect(isSpeakerRecipientHiddenFromAudience("Иванов")).toBe(false);
    expect(shouldShowSpeakerRecipientToAudience(SPEAKER_NOT_SELECTED)).toBe(false);
    expect(shouldShowSpeakerRecipientToAudience("Иванов")).toBe(true);
  });
});
