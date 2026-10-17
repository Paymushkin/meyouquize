import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractLocalMediaFilename,
  findRemovedLocalMediaUrls,
  resolveMediaFilePath,
} from "../src/media-cleanup.js";

describe("extractLocalMediaFilename", () => {
  it("parses relative media URLs", () => {
    expect(extractLocalMediaFilename("/media/abc.png")).toBe("abc.png");
  });

  it("parses absolute media URLs", () => {
    expect(extractLocalMediaFilename("http://localhost:4000/media/abc.png")).toBe("abc.png");
  });

  it("ignores external URLs without /media path", () => {
    expect(extractLocalMediaFilename("https://example.com/image.png")).toBeNull();
  });
});

describe("findRemovedLocalMediaUrls", () => {
  it("returns media urls dropped between prev and next", () => {
    expect(
      findRemovedLocalMediaUrls(
        {
          videoWallHorizontalPosterUrl: "/media/old-h.jpg",
          videoWallTileCoverUrl: "http://localhost:4000/media/tile.png",
        },
        {
          videoWallHorizontalPosterUrl: "/media/new-h.jpg",
          videoWallTileCoverUrl: "",
        },
      ),
    ).toEqual(["/media/old-h.jpg", "http://localhost:4000/media/tile.png"]);
  });

  it("ignores urls still referenced under another field", () => {
    expect(
      findRemovedLocalMediaUrls(
        { a: "/media/shared.jpg", b: "" },
        { a: "", b: "/media/shared.jpg" },
      ),
    ).toEqual([]);
  });
});

describe("resolveMediaFilePath", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("resolves files inside media directory", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-cleanup-"));
    const resolved = resolveMediaFilePath("demo.png", tempDir);
    expect(resolved).toBe(path.join(tempDir, "demo.png"));
  });

  it("rejects path traversal", () => {
    tempDir = path.join(os.tmpdir(), "media-cleanup-safe");
    expect(resolveMediaFilePath("../secret.png", tempDir)).toBeNull();
  });
});
