/**
 * Дебаты: N одновременных Socket.IO соединений + N голосов + hold.
 *
 *   BASE_URL=https://meyou.site QUIZ_SLUG=alfa2-2 PLAYER_COUNT=300 \
 *     npm run loadtest:debate-n -w server
 *
 * Опции: QUESTION_ID, JOIN_RAMP_MS, VOTE_WINDOW_MS, HOLD_MS,
 *        VOTE_DISTRIBUTION=normal|uniform, SUBMIT_TIMEOUT_MS
 */
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { sampleDelayMs } from "./event-load-helpers.mjs";

const base = (process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const slug = (process.env.QUIZ_SLUG || "").trim();
const players = Math.max(1, Number(process.env.PLAYER_COUNT || 300));
const joinRampMs = Math.max(0, Number(process.env.JOIN_RAMP_MS || 20_000));
const voteWindowMs = Math.max(1_000, Number(process.env.VOTE_WINDOW_MS || 63_000));
const holdMs = Math.max(0, Number(process.env.HOLD_MS || 30_000));
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const voteDistribution = (process.env.VOTE_DISTRIBUTION || "normal").trim().toLowerCase();
const submitTimeoutMs = Math.max(3_000, Number(process.env.SUBMIT_TIMEOUT_MS || 45_000));

/** Веса голосов «плывут» со временем (как debate-sweep). */
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

function weightsAtProgress(progress) {
  const t = Math.max(0, Math.min(1, progress));
  if (t <= WEIGHT_KEYFRAMES_3[0].t) return [...WEIGHT_KEYFRAMES_3[0].w];
  const last = WEIGHT_KEYFRAMES_3[WEIGHT_KEYFRAMES_3.length - 1];
  if (t >= last.t) return [...last.w];
  let i = 0;
  while (i < WEIGHT_KEYFRAMES_3.length - 1 && WEIGHT_KEYFRAMES_3[i + 1].t < t) i += 1;
  const a = WEIGHT_KEYFRAMES_3[i];
  const b = WEIGHT_KEYFRAMES_3[i + 1];
  const u = (t - a.t) / (b.t - a.t || 1);
  return a.w.map((wa, k) => wa * (1 - u) + (b.w[k] ?? 0) * u);
}

function adaptWeights(weights3, optionCount) {
  if (optionCount >= 3) return weights3.slice(0, 3);
  if (optionCount === 2) {
    const a = weights3[0] ?? 0;
    const b = (weights3[1] ?? 0) + (weights3[2] ?? 0);
    const sum = a + b || 1;
    return [a / sum, b / sum];
  }
  return [1];
}

function pickOptionIndex(weights) {
  const positive = weights.map((w) => Math.max(0, Number(w) || 0));
  const sum = positive.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum;
  for (let i = 0; i < positive.length; i += 1) {
    r -= positive[i];
    if (r <= 0) return i;
  }
  return positive.length - 1;
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
  if (forcedQuestionId) {
    const all = [state?.activeQuestion, ...(state?.activeQuestions || [])].filter(Boolean);
    return all.find((q) => q.id === forcedQuestionId) || { id: forcedQuestionId, options: [] };
  }
  const candidates = [];
  if (state?.activeQuestion) candidates.push(state.activeQuestion);
  if (Array.isArray(state?.activeQuestions)) candidates.push(...state.activeQuestions);
  return (
    candidates.find(
      (q) =>
        q?.id &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 3 &&
        (q.projectorDebateLayout === true || (!q.geoPollDictionary && q.type === "single")),
    ) || null
  );
}

function connectAndJoin(index) {
  return new Promise((resolve) => {
    const nickname = `d300_${index + 1}`.slice(0, 32);
    const deviceId = randomUUID();
    const socket = io(base, {
      transports: ["websocket"],
      reconnection: false,
      timeout: 20_000,
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, err: "join_timeout", socket, nickname });
    }, 25_000);

    socket.on("connect_error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, err: `connect:${err?.message || err}`, socket, nickname });
    });

    socket.on("error:message", (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        err: String(msg?.message || msg || "error:message"),
        socket,
        nickname,
      });
    });

    socket.on("connect", () => {
      socket.emit("quiz:join", { slug, nickname, deviceId });
    });

    socket.on("quiz:joined", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: true, socket, nickname });
    });
  });
}

function submitVote(socket, quizId, questionId, optionId) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off("answer:submitted", onOk);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: "submit_timeout" });
    }, submitTimeoutMs);

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("answer:submitted", onOk);
      socket.off("error:message", onErr);
      resolve(result);
    }

    function onOk() {
      finish({ ok: true });
    }
    function onErr(msg) {
      finish({ ok: false, err: String(msg?.message || msg || "error:message") });
    }

    socket.on("answer:submitted", onOk);
    socket.on("error:message", onErr);
    socket.emit("answer:submit", {
      quizId,
      questionId,
      optionIds: [optionId],
    });
  });
}

async function main() {
  if (!slug) {
    console.error("[debate-n] QUIZ_SLUG is required");
    process.exit(1);
  }
  if (!["uniform", "normal"].includes(voteDistribution)) {
    console.error("[debate-n] VOTE_DISTRIBUTION must be uniform or normal");
    process.exit(1);
  }

  console.info(
    `[debate-n] base=${base} slug=${slug} players=${players} join_ramp_ms=${joinRampMs} vote_window_ms=${voteWindowMs} hold_ms=${holdMs} dist=${voteDistribution}`,
  );

  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");
  const state = await fetchState(quizId);
  const question = findDebateQuestion(state);
  if (!question?.id) throw new Error("no active debate question (set QUESTION_ID or activate)");
  const options = (question.options || []).filter((o) => o?.id);
  if (options.length < 2) {
    // refetch via forced id may lack options — pull from state again
    throw new Error(`debate needs ≥2 options, got ${options.length}`);
  }

  console.info(
    `[debate-n] quizId=${quizId} questionId=${question.id} text=${JSON.stringify(question.text || "")} options=${options.map((o) => o.text || o.id).join(" / ")}`,
  );

  const startedAt = Date.now();
  console.info(`[debate-n] connecting ${players} sockets…`);

  const clients = await Promise.all(
    Array.from({ length: players }, async (_, i) => {
      await sleep(joinRampMs > 0 ? Math.floor((i / players) * joinRampMs) : 0);
      return connectAndJoin(i);
    }),
  );

  const joined = clients.filter((c) => c.ok && c.socket?.connected);
  const joinFail = clients.length - joined.length;
  console.info(`[debate-n] joined_ok=${joined.length}/${players} (+${Date.now() - startedAt}ms)`);
  if (joinFail > 0) {
    const reasons = new Map();
    for (const c of clients) {
      if (c.ok) continue;
      reasons.set(c.err || "unknown", (reasons.get(c.err || "unknown") ?? 0) + 1);
    }
    console.warn(
      `[debate-n] join_fail=${joinFail} reasons=${[...reasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }

  const delays = joined.map(() => sampleDelayMs(voteWindowMs, voteDistribution));
  const counts = options.map(() => 0);
  console.info(`[debate-n] voting ${joined.length} over ${voteWindowMs}ms…`);

  const voteResults = await Promise.all(
    joined.map(async (c, idx) => {
      const delay = delays[idx] ?? 0;
      await sleep(delay);
      const progress = voteWindowMs > 0 ? delay / voteWindowMs : 1;
      const weights = adaptWeights(weightsAtProgress(progress), options.length);
      const optIdx = pickOptionIndex(weights);
      const option = options[optIdx] || options[0];
      const result = await submitVote(c.socket, quizId, question.id, option.id);
      if (result.ok) counts[optIdx] = (counts[optIdx] ?? 0) + 1;
      return { ...result, optionText: option.text || option.id };
    }),
  );

  let voteOk = 0;
  const failReasons = new Map();
  for (const r of voteResults) {
    if (r.ok) voteOk += 1;
    else failReasons.set(r.err || "unknown", (failReasons.get(r.err || "unknown") ?? 0) + 1);
  }
  const totalVotes = counts.reduce((a, b) => a + b, 0) || 1;
  console.info(`[debate-n] submit_ok=${voteOk}/${joined.length} (+${Date.now() - startedAt}ms)`);
  console.info(
    `[debate-n] tally ${options.map((o, i) => `${o.text || o.id}:${counts[i]}(${Math.round((100 * counts[i]) / totalVotes)}%)`).join(" | ")}`,
  );
  if (failReasons.size) {
    console.warn(
      `[debate-n] submit_fail reasons=${[...failReasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }

  const live = joined.filter((c) => c.socket?.connected).length;
  console.info(`[debate-n] holding ${live} live connections for ${holdMs}ms…`);
  await sleep(holdMs);

  const stillLive = joined.filter((c) => c.socket?.connected).length;
  console.info(`[debate-n] connections_after_hold=${stillLive}`);

  for (const c of clients) {
    try {
      c.socket?.close();
    } catch {
      // ignore
    }
  }

  console.info(
    `[debate-n] done in ${Date.now() - startedAt}ms join_ok=${joined.length}/${players} vote_ok=${voteOk}/${joined.length} held=${stillLive}`,
  );

  if (joined.length < players * 0.95 || voteOk < joined.length * 0.95) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[debate-n] fatal:", err);
  process.exit(1);
});
