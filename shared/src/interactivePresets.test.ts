import { describe, expect, it } from "vitest";
import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
} from "./geoPollDictionaries.js";
import {
  buildDebatePollQuestionPatch,
  buildGeoPollQuestionPatch,
  debatePollOptions,
  isDebatePollPreset,
  isGeoPollPreset,
  withDebateOptionColors,
} from "./interactivePresets.js";

describe("interactivePresets", () => {
  it("detects geo poll preset", () => {
    expect(
      isGeoPollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        geoPollDictionary: GEO_POLL_DICTIONARY_WORLD_CITIES,
        options: [],
      }),
    ).toBe(true);
    expect(
      isGeoPollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        geoPollDictionary: GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
        options: [],
      }),
    ).toBe(true);
    expect(
      isGeoPollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        options: [{ text: "Россия" }, { text: "США" }],
      }),
    ).toBe(false);
  });

  it("detects debate poll preset", () => {
    expect(
      isDebatePollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        projectorDebateLayout: true,
        options: debatePollOptions(),
      }),
    ).toBe(true);
    expect(
      isDebatePollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        projectorDebateLayout: true,
        options: [{ text: "За левого" }, { text: "За правого" }, { text: "Воздержался" }],
      }),
    ).toBe(true);
    expect(
      isDebatePollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        projectorDebateLayout: true,
        options: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }],
      }),
    ).toBe(true);
    expect(
      isDebatePollPreset({
        type: "single",
        subQuizId: null,
        editorQuizMode: false,
        projectorDebateLayout: false,
        options: debatePollOptions(),
      }),
    ).toBe(false);
  });

  it("fills missing debate option colors", () => {
    const filled = withDebateOptionColors([
      { text: "A", color: null },
      { text: "B", color: "#00ff00" },
      { text: "C" },
    ]);
    expect(filled[0]?.color).toBe("#1976d2");
    expect(filled[1]?.color).toBe("#00ff00");
    expect(filled[2]?.color).toBe("#90a4ae");
  });

  it("builds geo and debate patches", () => {
    const geo = buildGeoPollQuestionPatch();
    expect(geo.options).toEqual([]);
    expect(geo.geoPollDictionary).toBe(GEO_POLL_DICTIONARY_WORLD_CITIES);

    const debate = buildDebatePollQuestionPatch("Тезис?");
    expect(debate.text).toBe("Тезис?");
    expect(debate.projectorDebateLayout).toBe(true);
  });
});
