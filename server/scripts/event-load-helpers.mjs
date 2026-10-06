/** @typedef {{ script: string[]; stylesheet: string[] }} ParsedAssetUrls */

/**
 * @param {string} html
 * @returns {ParsedAssetUrls}
 */
export function parseAssetUrlsFromHtml(html) {
  const script = [];
  const stylesheet = [];
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi;
  const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    if (m[1]) script.push(m[1]);
  }
  while ((m = linkRe.exec(html)) !== null) {
    if (m[1]) stylesheet.push(m[1]);
  }
  return { script, stylesheet };
}

/**
 * @param {string} path
 * @param {string} baseUrl
 */
export function resolveAssetUrl(path, baseUrl) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = new URL(baseUrl).origin;
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/** N(0,1) через Box–Muller */
export function randomStdNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * @param {number} windowMs
 * @param {"uniform" | "normal"} distribution
 */
export function sampleDelayMs(windowMs, distribution = "normal") {
  if (windowMs <= 1) return 0;
  if (distribution === "uniform") {
    return Math.floor(Math.random() * windowMs);
  }
  const mean = windowMs / 2;
  const std = windowMs / 6;
  for (let k = 0; k < 24; k += 1) {
    const x = mean + std * randomStdNormal();
    if (x >= 0 && x < windowMs) return Math.floor(x);
  }
  return Math.floor(Math.random() * windowMs);
}

/**
 * @param {number} totalPlayers
 * @param {number} rampMs
 * @param {"uniform" | "normal"} distribution
 */
export function buildJoinSchedule(totalPlayers, rampMs, distribution = "uniform") {
  if (rampMs <= 0) return Array.from({ length: totalPlayers }, () => 0);
  return Array.from({ length: totalPlayers }, () => sampleDelayMs(rampMs, distribution));
}

/**
 * @param {number} count
 * @param {number} ratio
 */
export function countByRatio(count, ratio) {
  return Math.max(0, Math.floor(count * ratio));
}

/**
 * @param {number} count
 * @param {number} ratio
 * @returns {Set<number>}
 */
export function pickIndicesByRatio(count, ratio) {
  const n = countByRatio(count, ratio);
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, n));
}

/**
 * @param {string[]} speakers
 * @param {boolean} allowAll
 */
export function pickSpeakerTarget(speakers, allowAll = true) {
  if (allowAll && Math.random() < 0.35) return "Все спикеры";
  if (speakers.length > 0) {
    return speakers[Math.floor(Math.random() * speakers.length)];
  }
  return "Все спикеры";
}

/**
 * @param {number[]} sorted
 * @param {number} p
 */
export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

/**
 * @param {Map<string, number>} map
 */
export function topReasons(map, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => `${reason}:${count}`)
    .join(", ");
}

/**
 * @param {unknown} state
 */
export function resolveSubmitTargetFromState(state) {
  const quizId = typeof state?.id === "string" ? state.id : "";
  const question = state?.activeQuestion;
  const questionId = typeof question?.id === "string" ? question.id : "";
  const optionId = question?.options?.[0]?.id;
  return {
    quizId,
    questionId,
    optionId: typeof optionId === "string" ? optionId : "",
    question,
  };
}

/**
 * Все открытые голосования: activeQuestion + activeQuestions без дублей.
 * @param {unknown} state
 */
export function collectOpenVoteTargetsFromState(state) {
  const quizId = typeof state?.id === "string" ? state.id : "";
  const seen = new Set();
  /** @type {Array<{ quizId: string; questionId: string; optionId: string; question: unknown }>} */
  const targets = [];
  const extra = Array.isArray(state?.activeQuestions) ? state.activeQuestions : [];
  for (const question of [state?.activeQuestion, ...extra]) {
    const questionId = typeof question?.id === "string" ? question.id : "";
    if (!questionId || seen.has(questionId)) continue;
    if (question?.isClosed === true) continue;
    const optionId = question?.options?.[0]?.id;
    if (typeof optionId !== "string" || !optionId) continue;
    seen.add(questionId);
    targets.push({ quizId, questionId, optionId, question });
  }
  return targets;
}

/**
 * @param {unknown} question
 */
export function buildAnswerPayloadFromQuestion(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const optionIds = options.map((o) => o?.id).filter((id) => typeof id === "string");
  const optionTexts = options.map((o) => o?.text).filter((text) => typeof text === "string");
  const qType = question?.type;

  if (qType === "single") {
    return { optionIds: optionIds.length > 0 ? [optionIds[0]] : [] };
  }
  if (qType === "multi") {
    const count = Math.max(1, Math.min(2, optionIds.length));
    return { optionIds: pickN(optionIds, count) };
  }
  if (qType === "ranking") {
    return { rankedOptionIds: pickN(optionIds, optionIds.length) };
  }
  if (qType === "tag_cloud") {
    const tags = pickN(
      optionTexts.length > 0 ? optionTexts : ["тест", "квиз", "demo"],
      Math.max(1, Math.min(3, optionTexts.length || 3)),
    );
    return { optionIds: [], tagAnswers: tags };
  }
  return { optionIds: optionIds.length > 0 ? [optionIds[0]] : [] };
}

/**
 * @param {string[]} list
 * @param {number} n
 */
export function pickN(list, n) {
  if (n <= 0) return [];
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/**
 * Ограничивает число одновременных async-задач (HTTP с одной машины).
 * @param {number} limit
 */
export function createSemaphore(limit) {
  const max = Math.max(1, Math.trunc(limit) || 1);
  let active = 0;
  /** @type {Array<() => void>} */
  const waiters = [];

  async function acquire() {
    if (active >= max) {
      await new Promise((resolve) => {
        waiters.push(resolve);
      });
    }
    active += 1;
  }

  function release() {
    active = Math.max(0, active - 1);
    const next = waiters.shift();
    if (next) next();
  }

  return {
    get active() {
      return active;
    },
    /**
     * @template T
     * @param {() => Promise<T>} fn
     * @returns {Promise<T>}
     */
    async run(fn) {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}

/**
 * @param {unknown} err
 */
export function isRetryableBootstrapError(err) {
  const msg = String(err ?? "");
  if (/fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|UND_ERR|socket hang up|network/i.test(msg)) {
    return true;
  }
  return /(?:page|meta|asset)_http_(429|502|503|504)\b/.test(msg);
}

/**
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {{
 *   attempts: number;
 *   delayMs: number;
 *   isRetryable: (result: T) => boolean;
 *   sleepFn?: (ms: number) => Promise<void>;
 * }} options
 */
export async function retryAsync(fn, options) {
  const attempts = Math.max(1, Math.trunc(options.attempts) || 1);
  const delayMs = Math.max(0, options.delayMs);
  const sleepFn = options.sleepFn ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  /** @type {T | undefined} */
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await fn(attempt);
    if (!options.isRetryable(last) || attempt === attempts) return last;
    if (delayMs > 0) await sleepFn(delayMs * attempt);
  }
  return last;
}

/**
 * Одно успешное значение на всех вызывающих; ошибка сбрасывает кэш.
 * @template T
 * @param {() => Promise<T>} loader
 */
export function createInflightCache(loader) {
  /** @type {Promise<T> | null} */
  let inflight = null;
  /** @type {T | undefined} */
  let value;
  let ready = false;
  return {
    get ready() {
      return ready;
    },
    async get() {
      if (ready) return value;
      if (!inflight) {
        inflight = Promise.resolve()
          .then(loader)
          .then((v) => {
            value = v;
            ready = true;
            inflight = null;
            return v;
          })
          .catch((err) => {
            inflight = null;
            throw err;
          });
      }
      return inflight;
    },
  };
}

/**
 * Общий inflight + TTL, чтобы 1000 клиентов не били /meta одновременно.
 * @template T
 * @param {() => Promise<T>} loader
 * @param {number} ttlMs
 */
export function createTtlCache(loader, ttlMs) {
  const ttl = Math.max(0, ttlMs);
  /** @type {Promise<T> | null} */
  let inflight = null;
  /** @type {T | undefined} */
  let value;
  let at = 0;
  return async function get() {
    const now = Date.now();
    if (value !== undefined && now - at < ttl) return value;
    if (!inflight) {
      inflight = Promise.resolve()
        .then(loader)
        .then((v) => {
          value = v;
          at = Date.now();
          inflight = null;
          return v;
        })
        .catch((err) => {
          inflight = null;
          throw err;
        });
    }
    return inflight;
  };
}
