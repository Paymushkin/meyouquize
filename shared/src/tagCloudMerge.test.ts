import { describe, expect, it } from "vitest";
import { buildCloudWordsForDisplay } from "./tagCloudMerge.js";

describe("buildCloudWordsForDisplay", () => {
  it("merges live tags with injected words", () => {
    expect(
      buildCloudWordsForDisplay({
        liveTags: [{ text: "alpha", count: 2 }],
        hiddenTagTexts: [],
        injectedTagWords: [
          { text: "alpha", count: 1 },
          { text: "beta", count: 3 },
        ],
        tagCountOverrides: [],
      }),
    ).toEqual([
      { text: "alpha", count: 3 },
      { text: "beta", count: 3 },
    ]);
  });

  it("hides tags and applies overrides", () => {
    expect(
      buildCloudWordsForDisplay({
        liveTags: [
          { text: "hidden", count: 5 },
          { text: "shown", count: 1 },
        ],
        hiddenTagTexts: ["hidden"],
        injectedTagWords: [],
        tagCountOverrides: [{ text: "shown", count: 9 }],
      }),
    ).toEqual([{ text: "shown", count: 9 }]);
  });

  it("merges tags case-insensitively", () => {
    expect(
      buildCloudWordsForDisplay({
        liveTags: [
          { text: "Сантехник", count: 10 },
          { text: "сантехник", count: 3 },
        ],
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [],
      }),
    ).toEqual([{ text: "сантехник", count: 13 }]);
  });

  it("hides tags case-insensitively", () => {
    expect(
      buildCloudWordsForDisplay({
        liveTags: [{ text: "Сантехник", count: 5 }],
        hiddenTagTexts: ["сантехник"],
        injectedTagWords: [],
        tagCountOverrides: [],
      }),
    ).toEqual([]);
  });

  it("falls back to live tags when overrides zero everything", () => {
    expect(
      buildCloudWordsForDisplay({
        liveTags: [{ text: "only", count: 2 }],
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [{ text: "only", count: 0 }],
      }),
    ).toEqual([{ text: "only", count: 2 }]);
  });
});
