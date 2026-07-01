import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  fontRegistryFileExists,
  pruneStaleFontRegistry,
  publicFontEntry,
  readFontLibrary,
  registerFont,
} from "../src/font-library.js";

describe("font-library", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeMediaDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mq-fonts-"));
    dirs.push(dir);
    return dir;
  }

  it("prunes registry entries with missing media files", () => {
    const mediaDir = makeMediaDir();
    const alivePath = path.join(mediaDir, "alive.woff2");
    fs.writeFileSync(alivePath, "font-bytes");
    fs.writeFileSync(
      path.join(mediaDir, "fonts-registry.json"),
      JSON.stringify({
        fonts: [
          {
            id: "1",
            family: "Alive",
            url: "/media/alive.woff2",
            kind: "static",
            fileName: "alive.woff2",
            sha256: "a",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "2",
            family: "Gone",
            url: "/media/missing.woff2",
            kind: "static",
            fileName: "missing.woff2",
            sha256: "b",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    const fonts = pruneStaleFontRegistry(mediaDir);
    expect(fonts).toHaveLength(1);
    expect(fonts[0]?.family).toBe("Alive");
    expect(readFontLibrary(mediaDir)).toHaveLength(1);
    expect(fontRegistryFileExists(fonts[0]!, mediaDir)).toBe(true);
  });

  it("rewrites localhost media url to current origin", () => {
    const font = publicFontEntry(
      {
        id: "1",
        family: "Test",
        url: "http://localhost:4000/media/font.woff2",
        kind: "static",
        fileName: "font.woff2",
        sha256: "x",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      "https://meyou.site",
    );
    expect(font.url).toBe("https://meyou.site/media/font.woff2");
  });

  it("re-registers font when sha matches stale registry entry", () => {
    const mediaDir = makeMediaDir();
    const bytes = Buffer.from("same-font-payload");
    const sha = "deadbeef";
    fs.writeFileSync(
      path.join(mediaDir, "fonts-registry.json"),
      JSON.stringify({
        fonts: [
          {
            id: "old",
            family: "Custom",
            url: "/media/old.woff2",
            kind: "static",
            fileName: "old.woff2",
            sha256: sha,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    const uploadPath = path.join(mediaDir, "new.woff2");
    fs.writeFileSync(uploadPath, bytes);

    const result = registerFont({
      mediaDir,
      fileName: "new.woff2",
      filePath: uploadPath,
      fileUrl: "/media/new.woff2",
      family: "Custom",
      kind: "static",
    });

    expect(result.duplicate).toBe(false);
    expect(result.font.url).toBe("/media/new.woff2");
    expect(readFontLibrary(mediaDir)).toHaveLength(1);
  });
});
