import { describe, expect, it } from "vitest";
import { draftsToSessions, sessionsToDrafts } from "./adminSpeakerQuestionsSettings";

describe("adminSpeakerQuestionsSettings drafts", () => {
  it("round-trips speakers text", () => {
    const drafts = sessionsToDrafts([{ id: "s1", name: "Утро", speakers: ["А", "Б"] }]);
    expect(drafts[0]?.speakersText).toBe("А\nБ");
    expect(draftsToSessions(drafts)).toEqual([{ id: "s1", name: "Утро", speakers: ["А", "Б"] }]);
  });
});
