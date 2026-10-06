import { describe, expect, it } from "vitest";
import {
  inferQuestionUseImages,
  optionHasImage,
  optionHasTextOrImage,
  optionText,
  optionTextTrimmed,
} from "./voteOptionContent.js";

describe("voteOptionContent", () => {
  it("normalizes missing option text to empty string", () => {
    expect(optionText(undefined)).toBe("");
    expect(optionText(null)).toBe("");
    expect(optionText("  Да  ")).toBe("  Да  ");
    expect(optionTextTrimmed(undefined)).toBe("");
    expect(optionTextTrimmed(null)).toBe("");
    expect(optionTextTrimmed("  Да  ")).toBe("Да");
  });

  it("detects image on option", () => {
    expect(optionHasImage(" https://cdn/x.png ")).toBe(true);
    expect(optionHasImage("")).toBe(false);
  });

  it("accepts text or image as option content", () => {
    expect(optionHasTextOrImage("Да", null)).toBe(true);
    expect(optionHasTextOrImage("", "/img.png")).toBe(true);
    expect(optionHasTextOrImage(undefined, "/img.png")).toBe(true);
    expect(optionHasTextOrImage("  ", "  ")).toBe(false);
  });

  it("infers useImages from question or options", () => {
    expect(inferQuestionUseImages({ imageUrl: "/q.png", options: [] })).toBe(true);
    expect(
      inferQuestionUseImages({
        options: [{ imageUrl: "/a.png" }],
      }),
    ).toBe(true);
    expect(inferQuestionUseImages({ options: [{ text: "A" }] })).toBe(false);
  });
});
