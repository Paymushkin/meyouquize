import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isValidWoff2File } from "../src/font-library.js";

describe("isValidWoff2File", () => {
  const files: string[] = [];

  afterEach(() => {
    for (const file of files.splice(0)) {
      fs.unlinkSync(file);
    }
  });

  it("accepts wOF2 header", () => {
    const file = path.join(os.tmpdir(), `valid-${Date.now()}.woff2`);
    fs.writeFileSync(file, "wOF2----");
    files.push(file);
    expect(isValidWoff2File(file)).toBe(true);
  });

  it("rejects postscript payload with woff2 extension", () => {
    const file = path.join(os.tmpdir(), `invalid-${Date.now()}.woff2`);
    fs.writeFileSync(file, "%!PS-AdobeFont-1.0");
    files.push(file);
    expect(isValidWoff2File(file)).toBe(false);
  });
});
