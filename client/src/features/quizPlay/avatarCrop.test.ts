import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_UPLOAD_BYTES,
  AVATAR_ZOOM_MIN,
  clampAvatarCropOffset,
  coverScale,
  scaleCropView,
} from "./avatarCrop";

describe("coverScale", () => {
  it("covers square view with landscape image", () => {
    expect(coverScale(200, 100, 100)).toBe(1);
  });

  it("covers square view with portrait image", () => {
    expect(coverScale(100, 200, 100)).toBe(1);
  });

  it("scales up small images", () => {
    expect(coverScale(50, 50, 100)).toBe(2);
  });
});

describe("clampAvatarCropOffset", () => {
  it("allows horizontal pan for landscape at zoom 1", () => {
    const clamped = clampAvatarCropOffset(200, 100, 100, AVATAR_ZOOM_MIN, 999, 0);
    expect(clamped.offsetX).toBe(50);
    expect(clamped.offsetY).toBe(0);
  });

  it("zero pan when image exactly covers", () => {
    const clamped = clampAvatarCropOffset(100, 100, 100, 1, 20, -10);
    expect(clamped).toEqual({ offsetX: 0, offsetY: 0 });
  });

  it("expands pan range when zoomed", () => {
    const atZoom1 = clampAvatarCropOffset(200, 100, 100, 1, 999, 0);
    const atZoom2 = clampAvatarCropOffset(200, 100, 100, 2, 999, 0);
    expect(atZoom2.offsetX).toBeGreaterThan(atZoom1.offsetX);
  });
});

describe("scaleCropView", () => {
  it("scales offsets with view size", () => {
    expect(scaleCropView({ zoom: 1.5, offsetX: 10, offsetY: -4 }, 100, 200)).toEqual({
      zoom: 1.5,
      offsetX: 20,
      offsetY: -8,
    });
  });
});

describe("AVATAR_MAX_UPLOAD_BYTES", () => {
  it("keeps a small client-side upload budget", () => {
    expect(AVATAR_MAX_UPLOAD_BYTES).toBeLessThanOrEqual(200_000);
  });
});
