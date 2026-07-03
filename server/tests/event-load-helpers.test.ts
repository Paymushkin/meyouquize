import { describe, expect, it } from "vitest";
import {
  buildJoinSchedule,
  countByRatio,
  parseAssetUrlsFromHtml,
  pickIndicesByRatio,
  pickSpeakerTarget,
  resolveAssetUrl,
  sampleDelayMs,
} from "../scripts/event-load-helpers.mjs";

describe("parseAssetUrlsFromHtml", () => {
  it("extracts script and stylesheet paths", () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="/assets/index-abc.css" />
        </head>
        <body>
          <script type="module" src="/assets/index-xyz.js"></script>
        </body>
      </html>
    `;
    const parsed = parseAssetUrlsFromHtml(html);
    expect(parsed.script).toEqual(["/assets/index-xyz.js"]);
    expect(parsed.stylesheet).toEqual(["/assets/index-abc.css"]);
  });
});

describe("resolveAssetUrl", () => {
  it("resolves relative paths against base origin", () => {
    expect(resolveAssetUrl("/assets/app.js", "https://meyou.site")).toBe(
      "https://meyou.site/assets/app.js",
    );
  });
});

describe("sampleDelayMs", () => {
  it("returns values within vote window", () => {
    for (let i = 0; i < 50; i += 1) {
      const d = sampleDelayMs(60_000, "uniform");
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(60_000);
    }
  });
});

describe("buildJoinSchedule", () => {
  it("returns zeros when ramp is disabled", () => {
    expect(buildJoinSchedule(5, 0)).toEqual([0, 0, 0, 0, 0]);
  });

  it("returns one delay per player when ramp enabled", () => {
    const schedule = buildJoinSchedule(10, 1000);
    expect(schedule).toHaveLength(10);
    for (const d of schedule) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(1000);
    }
  });
});

describe("countByRatio / pickIndicesByRatio", () => {
  it("picks expected subset size", () => {
    expect(countByRatio(100, 0.1)).toBe(10);
    expect(pickIndicesByRatio(100, 0.1).size).toBe(10);
  });
});

describe("pickSpeakerTarget", () => {
  it("uses configured speakers when present", () => {
    const picked = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      picked.add(pickSpeakerTarget(["Иванов", "Петров"], false));
    }
    expect([...picked].every((s) => s === "Иванов" || s === "Петров")).toBe(true);
  });
});
