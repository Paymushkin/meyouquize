import { describe, expect, it } from "vitest";
import { buildModeratorDocumentTitle, buildModeratorHeading } from "./speakerModeratorPageTitles";

describe("speakerModeratorPageTitles", () => {
  it("uses event title in heading and document title when present", () => {
    expect(buildModeratorHeading("  Альфа Саммит  ")).toBe("Вопросы спикерам | Альфа Саммит");
    expect(buildModeratorDocumentTitle("Альфа Саммит")).toBe("Вопросы спикерам | Альфа Саммит");
  });

  it("falls back when event title is empty", () => {
    expect(buildModeratorHeading("")).toBe("Вопросы спикерам");
    expect(buildModeratorDocumentTitle("   ")).toBe("Вопросы спикерам · МИЮ");
  });
});
