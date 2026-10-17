import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEAKER_SESSION_NAME,
  LEGACY_DEFAULT_SPEAKER_SESSION_ID,
  groupSpeakerQuestionsBySession,
  normalizeSpeakerQuestionSessions,
} from "./speakerQuestionSessions.js";

describe("normalizeSpeakerQuestionSessions", () => {
  it("migrates legacy speakers into one default session", () => {
    const result = normalizeSpeakerQuestionSessions({
      speakers: ["Иванов", "Петров"],
    });
    expect(result.sessions).toEqual([
      {
        id: LEGACY_DEFAULT_SPEAKER_SESSION_ID,
        name: DEFAULT_SPEAKER_SESSION_NAME,
        speakers: ["Иванов", "Петров"],
      },
    ]);
    expect(result.activeSpeakerSessionId).toBe(LEGACY_DEFAULT_SPEAKER_SESSION_ID);
    expect(result.speakers).toEqual(["Иванов", "Петров"]);
  });

  it("is idempotent for legacy migration", () => {
    const a = normalizeSpeakerQuestionSessions({ speakers: ["Иванов"] });
    const b = normalizeSpeakerQuestionSessions({
      sessions: a.sessions,
      activeSpeakerSessionId: a.activeSpeakerSessionId,
      speakers: a.speakers,
    });
    expect(b.sessions).toEqual(a.sessions);
    expect(b.activeSpeakerSessionId).toBe(a.activeSpeakerSessionId);
  });

  it("derives speakers from active session", () => {
    const result = normalizeSpeakerQuestionSessions({
      sessions: [
        { id: "s1", name: "Утро", speakers: ["А"] },
        { id: "s2", name: "Вечер", speakers: ["Б", "В"] },
      ],
      activeSpeakerSessionId: "s2",
    });
    expect(result.speakers).toEqual(["Б", "В"]);
    expect(result.activeSpeakerSessionId).toBe("s2");
  });

  it("falls back to first session when active id is missing", () => {
    const result = normalizeSpeakerQuestionSessions({
      sessions: [{ id: "s1", name: "A", speakers: ["X"] }],
      activeSpeakerSessionId: "missing",
    });
    expect(result.activeSpeakerSessionId).toBe("s1");
    expect(result.speakers).toEqual(["X"]);
  });

  it("returns empty when no sessions and no speakers", () => {
    const result = normalizeSpeakerQuestionSessions({});
    expect(result.sessions).toEqual([]);
    expect(result.activeSpeakerSessionId).toBeNull();
    expect(result.speakers).toEqual([]);
  });
});

describe("groupSpeakerQuestionsBySession", () => {
  it("keeps session order and appends unknown / null", () => {
    const sessions = [
      { id: "s1", name: "Утро", speakers: [] },
      { id: "s2", name: "Вечер", speakers: [] },
    ];
    const items = [
      { id: "a", sessionId: "s2", sessionName: "Вечер" },
      { id: "b", sessionId: "s1", sessionName: "Утро" },
      { id: "c", sessionId: "gone", sessionName: "Старая" },
      { id: "d", sessionId: null, sessionName: null },
    ];
    expect(groupSpeakerQuestionsBySession(items, sessions)).toEqual([
      {
        sessionId: "s1",
        sessionName: "Утро",
        items: [{ id: "b", sessionId: "s1", sessionName: "Утро" }],
      },
      {
        sessionId: "s2",
        sessionName: "Вечер",
        items: [{ id: "a", sessionId: "s2", sessionName: "Вечер" }],
      },
      {
        sessionId: "gone",
        sessionName: "Старая",
        items: [{ id: "c", sessionId: "gone", sessionName: "Старая" }],
      },
      {
        sessionId: null,
        sessionName: "Без сессии",
        items: [{ id: "d", sessionId: null, sessionName: null }],
      },
    ]);
  });
});
