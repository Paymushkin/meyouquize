/**
 * Имитация живого голосования по дебатам: за ~60 с игроки по очереди join+vote,
 * голоса копятся (без подстановки итоговых %). Веса вариантов меняются со временем —
 * на проекторе шкала «плывёт» как на реальном ивенте.
 *
 * Перед запуском: вопрос «Дебаты» активен, на проекторе stage results.
 *
 * Пример:
 *   QUIZ_SLUG=demo npm run loadtest:debate-sweep -w server
 *
 * Опции: BASE_URL, QUIZ_SLUG, QUESTION_ID, WINDOW_MS, PLAYER_COUNT,
 *        VOTE_DISTRIBUTION=normal|uniform, RESET_FIRST=1|0,
 *        SERIES=1 — голосовать по всем активным раундам одной серии параллельно.
 */
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sampleDelayMs } from "./event-load-helpers.mjs";

const base = (process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const slug = (process.env.QUIZ_SLUG || "").trim();
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const windowMs = Math.max(10_000, Number(process.env.WINDOW_MS || 60_000));
const playerCount = Math.max(12, Math.min(400, Number(process.env.PLAYER_COUNT || 90)));
const voteDistribution = (process.env.VOTE_DISTRIBUTION || "normal").trim().toLowerCase();
const resetFirst = (process.env.RESET_FIRST || "1").trim() !== "0";
const seriesMode = (process.env.SERIES || "0").trim() === "1";
const submitTimeoutMs = Math.max(3_000, Number(process.env.SUBMIT_TIMEOUT_MS || 12_000));

/**
 * Ключевые кадры весов [A,B,C] по прогрессу 0..1.
 * Ранние голоса — за первого, середина — борьба, финал — уход к третьему.
 */
const WEIGHT_KEYFRAMES_3 = [
  { t: 0, w: [0.82, 0.12, 0.06] },
  { t: 0.2, w: [0.55, 0.35, 0.1] },
  { t: 0.4, w: [0.35, 0.45, 0.2] },
  { t: 0.55, w: [0.28, 0.4, 0.32] },
  { t: 0.7, w: [0.2, 0.35, 0.45] },
  { t: 0.85, w: [0.15, 0.28, 0.57] },
  { t: 1, w: [0.12, 0.22, 0.66] },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Линейная интерполяция весов по прогрессу голосования 0..1. */
export function weightsAtProgress(progress, keyframes = WEIGHT_KEYFRAMES_3) {
  const t = Math.max(0, Math.min(1, progress));
  if (keyframes.length === 0) return [1];
  if (t <= keyframes[0].t) return [...keyframes[0].w];
  const last = keyframes[keyframes.length - 1];
  if (t >= last.t) return [...last.w];
  let i = 0;
  while (i < keyframes.length - 1 && keyframes[i + 1].t < t) i += 1;
  const a = keyframes[i];
  const b = keyframes[i + 1];
  const span = b.t - a.t || 1;
  const u = (t - a.t) / span;
  const n = Math.max(a.w.length, b.w.length);
  const out = [];
  for (let k = 0; k < n; k += 1) {
    out.push((a.w[k] ?? 0) * (1 - u) + (b.w[k] ?? 0) * u);
  }
  return out;
}

export function adaptWeightsToOptionCount(weights3, optionCount) {
  if (optionCount >= 3) return weights3.slice(0, 3);
  if (optionCount === 2) {
    const a = weights3[0] ?? 0;
    const b = (weights3[1] ?? 0) + (weights3[2] ?? 0);
    const sum = a + b;
    if (sum <= 0) return [0.5, 0.5];
    return [a / sum, b / sum];
  }
  return [1];
}

/** Выбор индекса варианта по весам. */
export function pickOptionIndex(weights, random = Math.random) {
  const positive = weights.map((w) => Math.max(0, Number(w) || 0));
  const sum = positive.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 0;
  let r = random() * sum;
  for (let i = 0; i < positive.length; i += 1) {
    r -= positive[i];
    if (r <= 0) return i;
  }
  return positive.length - 1;
}

/** @deprecated оставлено для совместимости тестов распределения пакета */
export function allocateVotesByShares(shares, totalVotes) {
  const n = shares.length;
  if (n === 0 || totalVotes <= 0) return [];
  const positive = shares.map((s) => Math.max(0, Number(s) || 0));
  const sum = positive.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const baseCount = Math.floor(totalVotes / n);
    const out = Array.from({ length: n }, () => baseCount);
    out[0] += totalVotes - baseCount * n;
    return out;
  }
  const raw = positive.map((s) => (s / sum) * totalVotes);
  const floors = raw.map((x) => Math.floor(x));
  let left = totalVotes - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (left <= 0) break;
    floors[item.i] += 1;
    left -= 1;
  }
  return floors;
}

async function fetchMeta() {
  const res = await fetch(`${base}/api/quiz/by-slug/${encodeURIComponent(slug)}/meta`);
  if (!res.ok) throw new Error(`meta_http_${res.status}`);
  return res.json();
}

async function fetchState(quizId) {
  const res = await fetch(`${base}/api/quiz/${encodeURIComponent(quizId)}/state`);
  if (!res.ok) throw new Error(`state_http_${res.status}`);
  return res.json();
}

function findDebateQuestion(state) {
  const candidates = [];
  if (state?.activeQuestion) candidates.push(state.activeQuestion);
  if (Array.isArray(state?.activeQuestions)) candidates.push(...state.activeQuestions);
  const withId = candidates.filter((q) => q?.id && Array.isArray(q.options));
  const debate = withId.find(
    (q) =>
      q.projectorDebateLayout === true &&
      q.options.length >= 2 &&
      q.options.length <= 3 &&
      !q.geoPollDictionary,
  );
  if (debate) return debate;
  return (
    withId.find((q) => q.options.length >= 2 && q.options.length <= 3 && q.type === "single") ??
    null
  );
}

function findDebateSeriesRounds(state, seriesId) {
  const candidates = [];
  if (state?.activeQuestion) candidates.push(state.activeQuestion);
  if (Array.isArray(state?.activeQuestions)) candidates.push(...state.activeQuestions);
  const sid = String(seriesId || "").trim();
  return candidates
    .filter(
      (q) =>
        q?.id &&
        Array.isArray(q.options) &&
        q.projectorDebateLayout === true &&
        String(q.debateSeriesId || "").trim() === sid &&
        q.options.length >= 2 &&
        q.options.length <= 3,
    )
    .sort(
      (a, b) =>
        (Number(a.debateRoundIndex) || 0) - (Number(b.debateRoundIndex) || 0) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

async function runSweepForQuestion({ quizId, question, label }) {
  const options = (question.options || []).filter((o) => o?.id);
  if (options.length < 2 || options.length > 3) {
    throw new Error(`${label}: debate needs 2–3 options, got ${options.length}`);
  }
  console.info(
    `[debate-sweep] ${label} questionId=${question.id} options=${options
      .map((o) => o.text || o.id)
      .join(" / ")}`,
  );
  if (resetFirst) {
    const reset = await resetQuestionAnswers(quizId, question.id);
    console.info(`[debate-sweep] ${label} reset ${reset.ok ? "ok" : `fail:${reset.err}`}`);
    await sleep(300);
  }
  const plan = buildVotePlan(options);
  console.info(`[debate-sweep] ${label} planned ≈ ${summarizePlan(plan, options)}`);
  const counts = options.map(() => 0);
  let ok = 0;
  let fail = 0;
  const startedAt = Date.now();
  let lastLogAt = 0;
  await Promise.all(
    plan.map(async (row) => {
      await sleep(row.delayMs);
      const result = await submitOneVote({
        quizId,
        questionId: question.id,
        optionId: row.optionId,
        nickname: `${label}_${row.nickname}`.slice(0, 32),
      });
      const elapsed = Date.now() - startedAt;
      if (result.ok) {
        ok += 1;
        counts[row.optionIndex] += 1;
      } else {
        fail += 1;
      }
      if (elapsed - lastLogAt >= 4_000 || ok + fail === plan.length) {
        lastLogAt = elapsed;
        const total = Math.max(
          1,
          counts.reduce((a, b) => a + b, 0),
        );
        console.info(
          `[debate-sweep] ${label} t=${(elapsed / 1000).toFixed(1)}s ok=${ok} fail=${fail} live=${options
            .map(
              (o, i) =>
                `${(o.text || o.id).slice(0, 12)}:${counts[i]}(${((counts[i] / total) * 100).toFixed(0)}%)`,
            )
            .join(" ")}`,
        );
      }
    }),
  );
  return { ok, fail, counts, options };
}

function resetQuestionAnswers(quizId, questionId) {
  return new Promise((resolve) => {
    const socket = io(base, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 10_000,
    });
    let settled = false;
    const finish = (ok, err) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.close();
      resolve({ ok, err });
    };
    const timer = setTimeout(() => finish(false, "reset_timeout"), 8_000);
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      finish(false, `connect:${err?.message || err}`);
    });
    socket.on("error:message", (msg) => {
      clearTimeout(timer);
      finish(false, String(msg?.message || msg || "error:message"));
    });
    socket.on("connect", () => {
      socket.emit("admin:answers:reset-question", { quizId, questionId });
      setTimeout(() => {
        clearTimeout(timer);
        finish(true);
      }, 400);
    });
  });
}

function submitOneVote({ quizId, questionId, optionId, nickname }) {
  return new Promise((resolve) => {
    const deviceId = randomUUID();
    const socket = io(base, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 10_000,
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.close();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, err: "timeout" }), submitTimeoutMs);
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      finish({ ok: false, err: `connect:${err?.message || err}` });
    });
    socket.on("error:message", (msg) => {
      clearTimeout(timer);
      finish({ ok: false, err: String(msg?.message || msg || "error:message") });
    });
    socket.on("connect", () => {
      socket.emit("quiz:join", { slug, nickname, deviceId });
    });
    socket.on("quiz:joined", () => {
      socket.emit("answer:submit", {
        quizId,
        questionId,
        optionIds: [optionId],
      });
    });
    socket.on("answer:submitted", () => {
      clearTimeout(timer);
      finish({ ok: true });
    });
  });
}

function buildVotePlan(options) {
  /** @type {Array<{ delayMs: number, optionIndex: number, optionId: string, nickname: string }>} */
  const plan = [];
  const dist = voteDistribution === "uniform" ? "uniform" : "normal";
  for (let i = 0; i < playerCount; i += 1) {
    const delayMs = sampleDelayMs(windowMs, dist);
    const progress = windowMs > 0 ? delayMs / windowMs : 0;
    const weights = adaptWeightsToOptionCount(weightsAtProgress(progress), options.length);
    const optionIndex = pickOptionIndex(weights);
    const option = options[optionIndex];
    plan.push({
      delayMs,
      optionIndex,
      optionId: option.id,
      nickname: `live_${i + 1}_${(option.text || "x").slice(0, 8)}`.slice(0, 32),
    });
  }
  plan.sort((a, b) => a.delayMs - b.delayMs);
  return plan;
}

function summarizePlan(plan, options) {
  const counts = options.map(() => 0);
  for (const row of plan) counts[row.optionIndex] += 1;
  const total = plan.length || 1;
  return options
    .map((o, i) => `${o.text || o.id}:${counts[i]} (${((counts[i] / total) * 100).toFixed(0)}%)`)
    .join(" | ");
}

async function main() {
  if (!slug) {
    console.error("[debate-sweep] QUIZ_SLUG is required (e.g. QUIZ_SLUG=demo)");
    process.exit(1);
  }
  if (!["uniform", "normal"].includes(voteDistribution)) {
    console.error("[debate-sweep] VOTE_DISTRIBUTION must be uniform or normal");
    process.exit(1);
  }

  console.info(
    `[debate-sweep] live vote sim base=${base} slug=${slug} windowMs=${windowMs} players=${playerCount} dist=${voteDistribution} resetFirst=${resetFirst} series=${seriesMode}`,
  );
  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");

  const state = await fetchState(quizId);
  let question = findDebateQuestion(state);
  if (forcedQuestionId) {
    const fromActive =
      state?.activeQuestion?.id === forcedQuestionId
        ? state.activeQuestion
        : (state?.activeQuestions || []).find((q) => q.id === forcedQuestionId);
    question = fromActive || { id: forcedQuestionId, options: question?.options || [] };
  }
  if (!question?.id) {
    throw new Error("no debate question (enable «Дебаты» or set QUESTION_ID)");
  }

  const startedAt = Date.now();
  /** @type {Array<{ ok: number, fail: number, counts: number[], options: any[] }>} */
  const results = [];

  if (seriesMode && question.debateSeriesId) {
    const rounds = findDebateSeriesRounds(state, question.debateSeriesId);
    if (rounds.length === 0) {
      throw new Error(`series ${question.debateSeriesId}: no active rounds`);
    }
    console.info(
      `[debate-sweep] quizId=${quizId} series=${question.debateSeriesId} rounds=${rounds.length}`,
    );
    // Параллельно по раундам — на проекторе «Итог серии» растёт сразу.
    const roundResults = await Promise.all(
      rounds.map((round, i) =>
        runSweepForQuestion({
          quizId,
          question: round,
          label: `r${(round.debateRoundIndex ?? i) + 1}`,
        }),
      ),
    );
    results.push(...roundResults);
  } else {
    console.info(`[debate-sweep] quizId=${quizId} questionId=${question.id}`);
    results.push(await runSweepForQuestion({ quizId, question, label: "q1" }));
  }

  let ok = 0;
  let fail = 0;
  for (const row of results) {
    ok += row.ok;
    fail += row.fail;
  }
  console.info(`[debate-sweep] done in ${Date.now() - startedAt}ms ok=${ok} fail=${fail}`);
  if (fail > 0) process.exitCode = 1;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error("[debate-sweep] fatal:", err?.message || err);
    process.exit(1);
  });
}
