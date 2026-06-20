import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { publicViewJsonToState } from "../src/socket/public-view-store.js";

describe("publicViewJsonToState", () => {
  it("returns defaults for null", () => {
    const state = publicViewJsonToState(null);
    expect(state.mode).toBe(DEFAULT_PUBLIC_VIEW_STATE.mode);
    expect(state.projectorJoinQrVisible).toBe(true);
  });

  it("normalizes partial JSON from database", () => {
    const state = publicViewJsonToState({
      mode: "question",
      questionId: "q-1",
      showVoteCount: true,
    });
    expect(state.mode).toBe("question");
    expect(state.questionId).toBe("q-1");
    expect(state.showVoteCount).toBe(true);
  });

  it("merges legacy program tile extras", () => {
    const state = publicViewJsonToState({
      mode: "title",
      programTileText: " Agenda ",
      programTileVisible: true,
      programTileLinkUrl: "https://example.com/agenda",
    });
    expect(state.programTileText).toBe(" Agenda ");
    expect(state.programTileVisible).toBe(true);
    expect(state.programTileLinkUrl).toBe("https://example.com/agenda");
  });

  it("merges speaker tile extras from partial json", () => {
    const state = publicViewJsonToState({
      mode: "title",
      speakerTileVisible: false,
      speakerTileTextColor: "#ffffff",
      programTileBackgroundColor: "#000000",
      programTileTextColor: "#eeeeee",
    });
    expect(state.speakerTileVisible).toBe(false);
    expect(state.speakerTileTextColor).toBe("#ffffff");
    expect(state.programTileBackgroundColor).toBe("#000000");
  });
});
