import { describe, expect, it } from "vitest";
import { buildBrandBackground } from "./brandVisual";

describe("buildBrandBackground", () => {
  it("returns none without image", () => {
    expect(buildBrandBackground({})).toMatchObject({
      backgroundImage: "none",
    });
  });

  it("builds overlay and image layers", () => {
    const style = buildBrandBackground({
      backgroundImageUrl: "/event-bg.png",
      backgroundAnchor: "bottom",
    });
    expect(style.backgroundImage).toContain("linear-gradient");
    expect(style.backgroundImage).toContain('url("/event-bg.png")');
    expect(style.backgroundPosition).toBe("center, center bottom");
  });

  it("supports fixed attachment with image", () => {
    const style = buildBrandBackground({
      backgroundImageUrl: "/bg.png",
      backgroundAttachment: "fixed",
    });
    expect(style.backgroundAttachment).toBe("fixed, fixed");
  });
});
