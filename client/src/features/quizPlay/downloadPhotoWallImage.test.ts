import { describe, expect, it } from "vitest";
import { photoWallDownloadFilename } from "./downloadPhotoWallImage";

describe("photoWallDownloadFilename", () => {
  it("uses URL basename when available", () => {
    expect(
      photoWallDownloadFilename({
        src: "https://storage.yandexcloud.net/bucket/event/12.jpeg",
        index: 12,
        key: "12",
        width: 1,
        height: 1,
      }),
    ).toBe("12.jpeg");
  });

  it("falls back to indexed name", () => {
    expect(
      photoWallDownloadFilename({
        src: "not-a-url",
        index: 3,
        key: "3",
        width: 1,
        height: 1,
      }),
    ).toBe("photo-3.jpg");
  });
});
