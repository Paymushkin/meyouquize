import { describe, expect, it } from "vitest";
import {
  addReaction,
  getReactionSessionPublic,
  startReactionSession,
  stopReactionSession,
} from "../src/reactions-service.js";

describe("reactions-service", () => {
  const quizId = "quiz-reactions-unit";

  it("starts session with default reactions and empty counts", async () => {
    const session = await startReactionSession(quizId, 30);
    expect(session.isActive).toBe(true);
    expect(session.reactions).toEqual(["👍", "👏", "🔥", "🤔"]);
    expect(session.counts["👍"]).toBe(0);
    expect(session.totalReactions).toBe(0);
  });

  it("accepts custom reaction list", async () => {
    const session = await startReactionSession(`${quizId}-custom`, 10, ["🎉", "❤️"]);
    expect(session.reactions).toEqual(["🎉", "❤️"]);
  });

  it("increments counts and tracks unique reactors", async () => {
    const id = `${quizId}-toggle`;
    await startReactionSession(id, 60, ["👍"]);
    const first = await addReaction(id, "p1", "👍");
    const second = await addReaction(id, "p2", "👍");
    expect(first?.counts["👍"]).toBe(1);
    expect(second?.counts["👍"]).toBe(2);
    expect(second?.uniqueReactors).toBe(2);
    expect((await addReaction(id, "p1", "👍"))?.counts["👍"]).toBe(3);
    expect(await addReaction(id, "p1", "unknown")).toBeNull();
  });

  it("stops session and keeps history", async () => {
    const id = `${quizId}-stop`;
    await startReactionSession(id, 60, ["👍"]);
    await addReaction(id, "p1", "👍");
    const stopped = await stopReactionSession(id);
    expect(stopped?.isActive).toBe(false);
    expect(stopped?.history.length).toBeGreaterThan(0);
    expect((await getReactionSessionPublic(id))?.isActive).toBe(false);
  });

  it("replaces active session when starting again", async () => {
    const id = `${quizId}-restart`;
    await startReactionSession(id, 30, ["👍"]);
    await addReaction(id, "p1", "👍");
    const next = await startReactionSession(id, 30, ["🔥"]);
    expect(next.reactions).toEqual(["🔥"]);
    expect(next.counts["🔥"]).toBe(0);
    expect(next.history.some((row) => row.counts["👍"] === 1)).toBe(true);
  });

  it("seeds counts from initialCounts on start", async () => {
    const id = `${quizId}-seed`;
    const session = await startReactionSession(id, 30, ["👍", "🔥"], { "👍": 4, "🔥": 2 });
    expect(session.counts["👍"]).toBe(4);
    expect(session.counts["🔥"]).toBe(2);
  });
});
