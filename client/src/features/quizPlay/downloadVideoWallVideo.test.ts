import { describe, expect, it } from "vitest";
import {
  videoWallDownloadFilename,
  withVideoWallDownloadContentDisposition,
} from "./downloadVideoWallVideo";

describe("videoWallDownloadFilename", () => {
  it("uses basename from video url", () => {
    expect(
      videoWallDownloadFilename({
        id: "1",
        src: "https://cdn.example/clips/rasul.mp4?response-content-type=video%2Fmp4",
        posterUrl: "",
        title: "Расул Турдиев",
        orientation: "horizontal",
        key: "1",
        index: 1,
      }),
    ).toBe("rasul.mp4");
  });

  it("falls back to title when url has no basename", () => {
    expect(
      videoWallDownloadFilename({
        id: "1",
        src: "not-a-url",
        posterUrl: "",
        title: "Расул Турдиев",
        orientation: "vertical",
        key: "1",
        index: 3,
      }),
    ).toBe("Расул Турдиев.mp4");
  });
});

describe("withVideoWallDownloadContentDisposition", () => {
  it("adds attachment disposition while keeping playback content-type", () => {
    const href = withVideoWallDownloadContentDisposition(
      "https://storage.yandexcloud.net/b/clip.mp4?response-content-type=video%2Fmp4",
      "Расул Турдиев.mp4",
    );
    const url = new URL(href);
    expect(url.searchParams.get("response-content-type")).toBe("video/mp4");
    expect(url.searchParams.get("response-content-disposition")).toContain("attachment");
    expect(url.searchParams.get("response-content-disposition")).toContain("UTF-8");
  });
});
