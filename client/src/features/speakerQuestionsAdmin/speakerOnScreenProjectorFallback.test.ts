import { describe, expect, it } from "vitest";
import { shouldFallbackProjectorToTitleAfterSpeakerOff } from "./speakerOnScreenProjectorFallback";

describe("shouldFallbackProjectorToTitleAfterSpeakerOff", () => {
  it("returns true when no speaker questions remain on screen", () => {
    expect(shouldFallbackProjectorToTitleAfterSpeakerOff(0)).toBe(true);
  });

  it("returns false when other questions stay on screen", () => {
    expect(shouldFallbackProjectorToTitleAfterSpeakerOff(1)).toBe(false);
    expect(shouldFallbackProjectorToTitleAfterSpeakerOff(2)).toBe(false);
  });
});
