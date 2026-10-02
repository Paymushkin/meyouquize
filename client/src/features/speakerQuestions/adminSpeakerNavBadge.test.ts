import { describe, expect, it } from "vitest";
import { shouldShowSpeakersNavBadge, syncKnownSpeakerQuestionIds } from "./adminSpeakerNavBadge";

describe("adminSpeakerNavBadge", () => {
  it("does not signal new on initial snapshot", () => {
    const first = syncKnownSpeakerQuestionIds(null, ["a", "b"]);
    expect(first.isInitialSnapshot).toBe(true);
    expect(first.hasNew).toBe(false);
    expect([...first.knownIds]).toEqual(["a", "b"]);
  });

  it("detects newly added question ids", () => {
    const first = syncKnownSpeakerQuestionIds(null, ["a"]);
    const second = syncKnownSpeakerQuestionIds(first.knownIds, ["a", "b"]);
    expect(second.hasNew).toBe(true);
    expect([...second.knownIds]).toEqual(["a", "b"]);
  });

  it("prunes removed ids without marking as new", () => {
    const first = syncKnownSpeakerQuestionIds(null, ["a", "b"]);
    const second = syncKnownSpeakerQuestionIds(first.knownIds, ["b"]);
    expect(second.hasNew).toBe(false);
    expect([...second.knownIds]).toEqual(["b"]);
  });

  it("shows badge only outside speakers section", () => {
    expect(shouldShowSpeakersNavBadge(true, "questions")).toBe(true);
    expect(shouldShowSpeakersNavBadge(true, "speakers")).toBe(false);
    expect(shouldShowSpeakersNavBadge(false, "questions")).toBe(false);
  });
});
