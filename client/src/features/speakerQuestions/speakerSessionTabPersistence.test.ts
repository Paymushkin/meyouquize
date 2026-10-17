import { beforeEach, describe, expect, it } from "vitest";
import {
  readSpeakerSessionTab,
  resolveSpeakerSessionTab,
  writeSpeakerSessionTab,
} from "./speakerSessionTabPersistence";

describe("speakerSessionTabPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and restores tab id by scope", () => {
    writeSpeakerSessionTab("mod:demo", "session-2");
    expect(readSpeakerSessionTab("mod:demo")).toBe("session-2");
    expect(readSpeakerSessionTab("admin:demo")).toBeNull();
  });

  it("prefers current when still valid", () => {
    writeSpeakerSessionTab("mod:demo", "session-2");
    expect(
      resolveSpeakerSessionTab(
        ["session-1", "session-2", "__all__"],
        "session-1",
        "mod:demo",
        "__all__",
      ),
    ).toBe("session-1");
  });

  it("falls back to stored then first tab", () => {
    writeSpeakerSessionTab("mod:demo", "session-2");
    expect(
      resolveSpeakerSessionTab(["session-1", "session-2", "__all__"], "", "mod:demo", "__all__"),
    ).toBe("session-2");
    expect(
      resolveSpeakerSessionTab(
        ["session-1", "session-2", "__all__"],
        "gone",
        "mod:other",
        "__all__",
      ),
    ).toBe("session-1");
  });

  it("defaults to first tab in list when nothing stored", () => {
    expect(
      resolveSpeakerSessionTab(
        ["session-plenary", "session-ai", "__all__"],
        "",
        "mod:fresh",
        "__all__",
      ),
    ).toBe("session-plenary");
  });
});
