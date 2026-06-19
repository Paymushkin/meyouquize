import { describe, expect, it } from "vitest";
import {
  inferQuestionUseImages,
  optionHasTextOrImage,
  playerOptionImageGridTemplate,
  questionHasOptionImages,
  shouldSpanFullWidthInOptionGrid,
} from "./voteOptionImages";

describe("questionHasOptionImages", () => {
  it("returns true when any option has image", () => {
    expect(
      questionHasOptionImages([
        { text: "A", imageUrl: "" },
        { text: "B", imageUrl: "/media/b.png" },
      ]),
    ).toBe(true);
  });

  it("returns false when no images", () => {
    expect(questionHasOptionImages([{ text: "A" }, { text: "B" }])).toBe(false);
  });
});

describe("playerOptionImageGridTemplate", () => {
  it("uses two columns for image options", () => {
    expect(playerOptionImageGridTemplate(true)).toBe("repeat(2, minmax(0, 1fr))");
    expect(playerOptionImageGridTemplate(false)).toBe("1fr");
  });
});

describe("shouldSpanFullWidthInOptionGrid", () => {
  it("spans last odd option in image grid", () => {
    expect(shouldSpanFullWidthInOptionGrid(true, 5, 4)).toBe(true);
    expect(shouldSpanFullWidthInOptionGrid(true, 4, 3)).toBe(false);
    expect(shouldSpanFullWidthInOptionGrid(false, 5, 4)).toBe(false);
  });
});

describe("inferQuestionUseImages", () => {
  it("returns true when question has image", () => {
    expect(inferQuestionUseImages({ imageUrl: "/q.png", options: [] })).toBe(true);
  });

  it("returns true when any option has image", () => {
    expect(
      inferQuestionUseImages({
        options: [{ imageUrl: "" }, { imageUrl: "/opt.png" }],
      }),
    ).toBe(true);
  });

  it("returns false when no images", () => {
    expect(inferQuestionUseImages({ imageUrl: "", options: [{ imageUrl: "" }] })).toBe(false);
  });
});

describe("optionHasTextOrImage", () => {
  it("accepts text or image", () => {
    expect(optionHasTextOrImage("", "/img.png")).toBe(true);
    expect(optionHasTextOrImage("A", "")).toBe(true);
    expect(optionHasTextOrImage("", "")).toBe(false);
  });
});
