import { describe, expect, it } from "vitest";
import {
  acknowledgeSpeakerQuestionIds,
  shouldShowSpeakersNavBadge,
  syncKnownSpeakerQuestionIds,
} from "./adminSpeakerNavBadge";

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

  it("acknowledge replaces last seen set with current ids", () => {
    expect([...acknowledgeSpeakerQuestionIds(["x", "y"])]).toEqual(["x", "y"]);
  });

  it("after acknowledge, same ids are not new; only later ids are", () => {
    const seen = acknowledgeSpeakerQuestionIds(["a", "b"]);
    const same = syncKnownSpeakerQuestionIds(seen, ["a", "b"]);
    expect(same.hasNew).toBe(false);
    const later = syncKnownSpeakerQuestionIds(same.knownIds, ["a", "b", "c"]);
    expect(later.hasNew).toBe(true);
  });
});
