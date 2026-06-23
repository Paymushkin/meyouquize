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
