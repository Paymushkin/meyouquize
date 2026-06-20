import { describe, expect, it } from "vitest";
import {
  addReaction,
  getReactionSessionPublic,
  startReactionSession,
  stopReactionSession,
} from "../src/reactions-service.js";

describe("reactions-service", () => {
  const quizId = "quiz-reactions-unit";

  it("starts session with default reactions and empty counts", () => {
    const session = startReactionSession(quizId, 30);
    expect(session.isActive).toBe(true);
    expect(session.reactions).toEqual(["👍", "👏", "🔥", "🤔"]);
    expect(session.counts["👍"]).toBe(0);
    expect(session.totalReactions).toBe(0);
  });

  it("accepts custom reaction list", () => {
    const session = startReactionSession(`${quizId}-custom`, 10, ["🎉", "❤️"]);
    expect(session.reactions).toEqual(["🎉", "❤️"]);
  });

  it("increments counts and tracks unique reactors", () => {
    const id = `${quizId}-toggle`;
    startReactionSession(id, 60, ["👍"]);
    const first = addReaction(id, "p1", "👍");
    const second = addReaction(id, "p2", "👍");
    expect(first?.counts["👍"]).toBe(1);
    expect(second?.counts["👍"]).toBe(2);
    expect(second?.uniqueReactors).toBe(2);
    expect(addReaction(id, "p1", "👍")?.counts["👍"]).toBe(3);
    expect(addReaction(id, "p1", "unknown")).toBeNull();
  });

  it("stops session and keeps history", () => {
    const id = `${quizId}-stop`;
    startReactionSession(id, 60, ["👍"]);
    addReaction(id, "p1", "👍");
    const stopped = stopReactionSession(id);
    expect(stopped?.isActive).toBe(false);
    expect(stopped?.history.length).toBeGreaterThan(0);
    expect(getReactionSessionPublic(id)?.isActive).toBe(false);
  });

  it("replaces active session when starting again", () => {
    const id = `${quizId}-restart`;
    startReactionSession(id, 30, ["👍"]);
    addReaction(id, "p1", "👍");
    const next = startReactionSession(id, 30, ["🔥"]);
    expect(next.reactions).toEqual(["🔥"]);
    expect(next.counts["🔥"]).toBe(0);
    expect(next.history.some((row) => row.counts["👍"] === 1)).toBe(true);
  });
});
