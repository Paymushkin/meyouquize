import { describe, expect, it } from "vitest";
import {
  RANDOMIZER_FREE_LIST_NAMES_TEXT_MAX_LENGTH,
  buildRandomizerAnimationPool,
  randomizerNamesTextForPublicView,
} from "./randomizerLogic";

describe("buildRandomizerAnimationPool", () => {
  it("prefers animation pool snapshot over empty names text", () => {
    expect(
      buildRandomizerAnimationPool({
        randomizerMode: "names",
        randomizerNamesText: "",
        randomizerMinNumber: 1,
        randomizerMaxNumber: 10,
        randomizerAnimationPool: ["Аня", "Боря", "Вика"],
      }),
    ).toEqual(["Аня", "Боря", "Вика"]);
  });

  it("falls back to names text when animation pool is empty", () => {
    expect(
      buildRandomizerAnimationPool({
        randomizerMode: "names",
        randomizerNamesText: "Аня\nБоря",
        randomizerMinNumber: 1,
        randomizerMaxNumber: 10,
        randomizerAnimationPool: [],
      }),
    ).toEqual(["Аня", "Боря"]);
  });
});

describe("randomizerNamesTextForPublicView", () => {
  it("clears names text in participants_only mode", () => {
    expect(randomizerNamesTextForPublicView("participants_only", "a\nb\nc")).toBe("");
  });

  it("keeps free_list text within max length", () => {
    const text = "x".repeat(RANDOMIZER_FREE_LIST_NAMES_TEXT_MAX_LENGTH + 100);
    expect(randomizerNamesTextForPublicView("free_list", text)).toHaveLength(
      RANDOMIZER_FREE_LIST_NAMES_TEXT_MAX_LENGTH,
    );
  });
});
