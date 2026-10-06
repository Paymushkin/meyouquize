import { describe, expect, it } from "vitest";
import {
  buildJoinSchedule,
  collectOpenVoteTargetsFromState,
  countByRatio,
  createInflightCache,
  createSemaphore,
  createTtlCache,
  isRetryableBootstrapError,
  parseAssetUrlsFromHtml,
  pickIndicesByRatio,
  pickSpeakerTarget,
  resolveAssetUrl,
  retryAsync,
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

describe("collectOpenVoteTargetsFromState", () => {
  it("returns unique open votes from activeQuestion and activeQuestions", () => {
    const targets = collectOpenVoteTargetsFromState({
      id: "quiz-1",
      activeQuestion: {
        id: "q1",
        type: "single",
        options: [{ id: "a1" }, { id: "a2" }],
      },
      activeQuestions: [
        {
          id: "q1",
          type: "single",
          options: [{ id: "a1" }, { id: "a2" }],
        },
        {
          id: "q2",
          type: "single",
          options: [{ id: "b1" }],
        },
        {
          id: "q3",
          type: "single",
          isClosed: true,
          options: [{ id: "c1" }],
        },
      ],
    });
    expect(targets.map((t) => t.questionId)).toEqual(["q1", "q2"]);
  });
});

describe("createSemaphore", () => {
  it("caps concurrent tasks", async () => {
    const sem = createSemaphore(2);
    let concurrent = 0;
    let max = 0;
    await Promise.all(
      Array.from({ length: 8 }, () =>
        sem.run(async () => {
          concurrent += 1;
          max = Math.max(max, concurrent);
          await new Promise((r) => setTimeout(r, 15));
          concurrent -= 1;
        }),
      ),
    );
    expect(max).toBeLessThanOrEqual(2);
  });
});

describe("isRetryableBootstrapError", () => {
  it("retries transport and gateway failures", () => {
    expect(isRetryableBootstrapError("fetch failed")).toBe(true);
    expect(isRetryableBootstrapError("meta_http_429")).toBe(true);
    expect(isRetryableBootstrapError("page_http_503")).toBe(true);
    expect(isRetryableBootstrapError("page_http_404")).toBe(false);
  });
});

describe("retryAsync", () => {
  it("retries then returns success", async () => {
    const sleeps = [];
    let n = 0;
    const result = await retryAsync(
      async () => {
        n += 1;
        return n === 3 ? { ok: true } : { ok: false, err: "fetch failed" };
      },
      {
        attempts: 3,
        delayMs: 10,
        isRetryable: (r) => !r.ok,
        sleepFn: async (ms) => {
          sleeps.push(ms);
        },
      },
    );
    expect(result).toEqual({ ok: true });
    expect(n).toBe(3);
    expect(sleeps).toEqual([10, 20]);
  });
});

describe("createInflightCache", () => {
  it("shares one loader call", async () => {
    let calls = 0;
    const cache = createInflightCache(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return "spa";
    });
    const [a, b] = await Promise.all([cache.get(), cache.get()]);
    expect(a).toBe("spa");
    expect(b).toBe("spa");
    expect(calls).toBe(1);
    expect(cache.ready).toBe(true);
    await cache.get();
    expect(calls).toBe(1);
  });
});

describe("createTtlCache", () => {
  it("coalesces inflight loads", async () => {
    let calls = 0;
    const get = createTtlCache(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return { id: "q" };
    }, 5_000);
    const [a, b] = await Promise.all([get(), get()]);
    expect(a).toEqual({ id: "q" });
    expect(b).toEqual({ id: "q" });
    expect(calls).toBe(1);
    await get();
    expect(calls).toBe(1);
  });
});
