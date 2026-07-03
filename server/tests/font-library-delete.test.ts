import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deleteFont, readFontLibrary, registerFont } from "../src/font-library.js";

describe("font-library deleteFont", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeMediaDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mq-fonts-del-"));
    dirs.push(dir);
    return dir;
  }

  it("deletes one static face without touching siblings", () => {
    const mediaDir = makeMediaDir();
    const regularPath = path.join(mediaDir, "regular.woff2");
    const boldPath = path.join(mediaDir, "bold.woff2");
    fs.writeFileSync(regularPath, "regular");
    fs.writeFileSync(boldPath, "bold");

    const regular = registerFont({
      mediaDir,
      fileName: "Family-Regular.woff2",
      filePath: regularPath,
      fileUrl: "/media/regular.woff2",
      family: "Family",
      kind: "static",
    }).font;
    const bold = registerFont({
      mediaDir,
      fileName: "Family-Bold.woff2",
      filePath: boldPath,
      fileUrl: "/media/bold.woff2",
      family: "Family",
      kind: "static",
    }).font;

    const deleted = deleteFont(mediaDir, regular.id);
    expect(deleted?.id).toBe(regular.id);
    expect(readFontLibrary(mediaDir)).toHaveLength(1);
    expect(readFontLibrary(mediaDir)[0]?.id).toBe(bold.id);
    expect(fs.existsSync(regularPath)).toBe(false);
    expect(fs.existsSync(boldPath)).toBe(true);
  });
});
