/**
 * Реалистичная нагрузка ивента: HTTP (SPA + meta) + Socket.IO (join, vote, speaker, reactions).
 *
 * Пример:
 *   BASE_URL=https://meyou.site QUIZ_SLUG=test-room node scripts/event-load.mjs
 */
import { io } from "socket.io-client";
import {
  buildAnswerPayloadFromQuestion,
  buildJoinSchedule,
  countByRatio,
  parseAssetUrlsFromHtml,
  percentile,
  pickIndicesByRatio,
  pickSpeakerTarget,
  resolveAssetUrl,
  resolveSubmitTargetFromState,
  sampleDelayMs,
  topReasons,
} from "./event-load-helpers.mjs";

const base = process.env.BASE_URL || "http://localhost:4000";
const slug = process.env.QUIZ_SLUG;
const players = Number(process.env.PLAYER_COUNT || 100);
const joinRampMs = Number(process.env.JOIN_RAMP_MS || 20_000);
const joinDistribution = (process.env.JOIN_DISTRIBUTION || "uniform").trim().toLowerCase();
const joinAckTimeoutMs = Number(process.env.JOIN_ACK_TIMEOUT_MS || 25_000);
const joinConnectRetries = Math.max(1, Number(process.env.JOIN_CONNECT_RETRIES ?? "3"));
const joinConnectBackoffMs = Math.max(0, Number(process.env.JOIN_CONNECT_BACKOFF_MS ?? "400"));
const joinFailTolerance = Math.max(
  0,
  Number.parseInt(process.env.JOIN_FAIL_TOLERANCE ?? "1", 10) || 0,
);
const voteWindowMs = Number(process.env.VOTE_WINDOW_MS || 60_000);
const voteDistribution = (process.env.VOTE_DISTRIBUTION || "normal").trim().toLowerCase();
const submitTimeoutMs = Number(process.env.SUBMIT_TIMEOUT_MS || 20_000);
const submitFailMaxRate = Number(process.env.SUBMIT_FAIL_MAX_RATE || 0.05);
const holdMs = Number(process.env.HOLD_MS || 30_000);
const postVotePauseMs = Number(process.env.POST_VOTE_PAUSE_MS || 1_000);
const speakerCreateSpreadMs = Number(process.env.SPEAKER_CREATE_SPREAD_MS || 2_500);
const speakerReactSpreadMs = Number(process.env.SPEAKER_REACT_SPREAD_MS || 2_500);
const reactionSpreadMs = Number(process.env.REACTION_SPREAD_MS || 1_500);
const speakerCreateRatio = Number(process.env.SPEAKER_CREATE_RATIO || 0.1);
const speakerReactRatio = Number(process.env.SPEAKER_REACT_RATIO || 0.3);
const reactionRatio = Number(process.env.REACTION_RATIO || 0.15);
const forcedQuizId = (process.env.QUIZ_ID || "").trim();
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const forcedOptionId = (process.env.OPTION_ID || "").trim();
const summaryOut = (process.env.SUMMARY_OUT || "").trim();

const httpBootstrapLatencies = [];
const joinLatencies = [];
const submitLatencies = [];
const speakerCreateLatencies = [];
const speakerReactLatencies = [];
const reactionLatencies = [];

const joinFailReasons = new Map();
const submitFailReasons = new Map();
const speakerCreateFailReasons = new Map();
const speakerReactFailReasons = new Map();
const reactionFailReasons = new Map();
const httpFailReasons = new Map();

/** @type {string[]} */
const speakerQuestionIds = [];

function validateConfig() {
  const issues = [];
  if (!slug) issues.push("QUIZ_SLUG is required");
  if (!Number.isFinite(players) || players <= 0) issues.push("PLAYER_COUNT must be > 0");
  if (!["uniform", "normal"].includes(joinDistribution)) {
    issues.push("JOIN_DISTRIBUTION must be uniform or normal");
  }
  if (!["uniform", "normal"].includes(voteDistribution)) {
    issues.push("VOTE_DISTRIBUTION must be uniform or normal");
  }
  return issues;
}

const configIssues = validateConfig();
if (configIssues.length > 0) {
  for (const issue of configIssues) {
    console.error(`[event-load] config error: ${issue}`);
  }
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bumpReason(map, reason) {
  const key = (reason || "unknown").toString();
  map.set(key, (map.get(key) ?? 0) + 1);
}

function logLatencyStats(prefix, latencies) {
  if (latencies.length === 0) return;
  const sorted = [...latencies].sort((a, b) => a - b);
  console.info(
    `${prefix} p50=${percentile(sorted, 50)} p95=${percentile(sorted, 95)} max=${sorted[sorted.length - 1]}`,
  );
}

async function fetchHttpBootstrap() {
  const t0 = Date.now();
  try {
    const pageUrl = new URL(`/q/${slug}`, base).toString();
    const pageRes = await fetch(pageUrl, { redirect: "follow" });
    if (!pageRes.ok) {
      bumpReason(httpFailReasons, `page_http_${pageRes.status}`);
      return { ok: false, err: `page_http_${pageRes.status}` };
    }
    const html = await pageRes.text();
    const assets = parseAssetUrlsFromHtml(html);
    const assetPaths = [...assets.script, ...assets.stylesheet].slice(0, 6);
    await Promise.all(
      assetPaths.map(async (path) => {
        const url = resolveAssetUrl(path, base);
        const res = await fetch(url);
        if (!res.ok) bumpReason(httpFailReasons, `asset_http_${res.status}`);
      }),
    );
    if (forcedQuizId) {
      httpBootstrapLatencies.push(Date.now() - t0);
      return { ok: true, meta: { id: forcedQuizId } };
    }
    const metaUrl = new URL(`/api/quiz/by-slug/${slug}/meta`, base).toString();
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      bumpReason(httpFailReasons, `meta_http_${metaRes.status}`);
      return { ok: false, err: `meta_http_${metaRes.status}` };
    }
    const meta = await metaRes.json();
    httpBootstrapLatencies.push(Date.now() - t0);
    return { ok: true, meta };
  } catch (err) {
    bumpReason(httpFailReasons, err instanceof Error ? err.message : String(err));
    return { ok: false, err: err instanceof Error ? err.message : String(err) };
  }
}

function makeClient(i, startDelayMs = 0) {
  return new Promise((resolve) => {
    let globalTimer = null;
    /** @type {import('socket.io-client').Socket | null} */
    let activeSocket = null;
    const nickname = `event_${i}_${Date.now()}`;
    const deviceId = `dev_${i}_${Math.random().toString(36).slice(2)}`;

    /** @type {{ socket: import('socket.io-client').Socket | null; lastState: unknown; quizId: string; speakers: string[]; reactions: string[]; allowAllSpeakers: boolean; speakerItems: Array<{ id: string }> }} */
    const client = {
      socket: null,
      lastState: null,
      quizId: "",
      speakers: [],
      reactions: ["👍", "❤️", "🔥"],
      allowAllSpeakers: true,
      speakerItems: [],
    };

    function finish(payload) {
      if (globalTimer) {
        clearTimeout(globalTimer);
        globalTimer = null;
      }
      resolve(payload);
    }

    function cleanupActiveSocket() {
      if (!activeSocket) return;
      try {
        activeSocket.removeAllListeners();
        activeSocket.close();
      } catch {
        /* ignore */
      }
      activeSocket = null;
      client.socket = null;
    }

    let handshakeAttempt = 0;

    async function startHandshakeAttempt() {
      const http = await fetchHttpBootstrap();
      if (!http.ok) {
        finish({ ok: false, err: http.err || "http_bootstrap_failed", client });
        return;
      }
      if (typeof http.meta?.id === "string") client.quizId = http.meta.id;

      cleanupActiveSocket();
      handshakeAttempt += 1;
      if (handshakeAttempt > joinConnectRetries) {
        finish({ ok: false, err: "connect_error", client });
        return;
      }

      const s = io(base, { transports: ["websocket"], reconnection: false });
      activeSocket = s;
      client.socket = s;

      s.on("state:quiz", (state) => {
        client.lastState = state;
        if (typeof state?.id === "string") client.quizId = state.id;
      });

      s.on("speaker:questions:update", (payload) => {
        if (Array.isArray(payload?.settings?.speakers)) {
          client.speakers = payload.settings.speakers;
        }
        if (Array.isArray(payload?.settings?.reactions) && payload.settings.reactions.length > 0) {
          client.reactions = payload.settings.reactions;
        }
        if (typeof payload?.settings?.allowAllSpeakersTarget === "boolean") {
          client.allowAllSpeakers = payload.settings.allowAllSpeakersTarget;
        }
        if (Array.isArray(payload?.items)) {
          client.speakerItems = payload.items.map((item) => ({ id: item.id }));
          for (const item of payload.items) {
            if (item?.id && !speakerQuestionIds.includes(item.id)) {
              speakerQuestionIds.push(item.id);
            }
          }
        }
      });

      s.on("connect", () => {
        const t0 = Date.now();
        s.emit("quiz:join", { slug, nickname, deviceId });
        s.once("quiz:joined", () => {
          joinLatencies.push(Date.now() - t0);
        });
      });

      s.once("quiz:joined", () => {
        s.emit("speaker:questions:subscribe", { slug, viewer: "player" });
        finish({ ok: true, client });
      });

      s.once("error:message", (e) => {
        finish({ ok: false, err: e?.message || "error:message", client });
      });

      s.once("connect_error", (err) => {
        if (handshakeAttempt < joinConnectRetries) {
          setTimeout(() => void startHandshakeAttempt(), joinConnectBackoffMs);
        } else {
          finish({ ok: false, err: err?.message || "connect_error", client });
        }
      });
    }

    const start = () => {
      globalTimer = setTimeout(() => {
        cleanupActiveSocket();
        finish({ ok: false, err: "join_ack_timeout", client });
      }, joinAckTimeoutMs);
      void startHandshakeAttempt();
    };

    if (startDelayMs > 0) setTimeout(start, startDelayMs);
    else start();
  });
}

function submitAnswer(socket, quizId, questionId, answerPayload) {
  return new Promise((resolve) => {
    let settled = false;
    const t0 = Date.now();
    let timer;
    function finish(ok, err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("answer:submitted", onOk);
      socket.off("error:message", onErr);
      resolve({ ok, err });
    }
    function onOk() {
      submitLatencies.push(Date.now() - t0);
      finish(true);
    }
    function onErr(e) {
      finish(false, e?.message || "error");
    }
    timer = setTimeout(() => finish(false, "submit_timeout"), submitTimeoutMs);
    socket.on("answer:submitted", onOk);
    socket.on("error:message", onErr);
    socket.emit("answer:submit", { quizId, questionId, ...answerPayload });
  });
}

async function resolveSubmitTarget(joinedClients, timeoutMs = 15_000) {
  if (forcedQuizId && forcedQuestionId && forcedOptionId) {
    return {
      quizId: forcedQuizId,
      questionId: forcedQuestionId,
      optionId: forcedOptionId,
      question: null,
      source: "env",
    };
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const c of joinedClients) {
      const target = resolveSubmitTargetFromState(c.lastState);
      if (target.quizId && target.questionId && target.optionId) {
        return { ...target, source: "state:quiz" };
      }
    }
    await sleep(250);
  }
  return null;
}

function speakerCreate(socket, quizId, speakerName, text) {
  return new Promise((resolve) => {
    let settled = false;
    const t0 = Date.now();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: "speaker_create_timeout" });
    }, submitTimeoutMs);

    function onUpdate(payload) {
      const mine = Array.isArray(payload?.items)
        ? payload.items.find((item) => item?.isMine)
        : null;
      if (!mine?.id) return;
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      speakerCreateLatencies.push(Date.now() - t0);
      if (!speakerQuestionIds.includes(mine.id)) speakerQuestionIds.push(mine.id);
      resolve({ ok: true, questionId: mine.id });
    }

    function onErr(e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: e?.message || "error" });
    }

    socket.on("speaker:questions:update", onUpdate);
    socket.on("error:message", onErr);
    socket.emit("speaker:question:create", { quizId, speakerName, text });
  });
}

function speakerReact(socket, quizId, speakerQuestionId, reaction) {
  return new Promise((resolve) => {
    let settled = false;
    const t0 = Date.now();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: "speaker_react_timeout" });
    }, submitTimeoutMs);

    function onUpdate() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      speakerReactLatencies.push(Date.now() - t0);
      resolve({ ok: true });
    }

    function onErr(e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: e?.message || "error" });
    }

    socket.on("speaker:questions:update", onUpdate);
    socket.on("error:message", onErr);
    socket.emit("speaker:question:react", { quizId, speakerQuestionId, reaction });
  });
}

function reactionToggle(socket, quizId, reactionType) {
  return new Promise((resolve) => {
    let settled = false;
    const t0 = Date.now();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off("error:message", onErr);
      resolve({ ok: false, err: "reaction_timeout" });
    }, 8_000);

    function onErr(e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("error:message", onErr);
      resolve({ ok: false, err: e?.message || "error" });
    }

    socket.on("error:message", onErr);
    socket.emit("reaction:toggle", { quizId, reactionType });
    settled = true;
    clearTimeout(timer);
    socket.off("error:message", onErr);
    reactionLatencies.push(Date.now() - t0);
    resolve({ ok: true });
  });
}

console.info(
  `[event-load] players=${players} join_ramp_ms=${joinRampMs} vote_window_ms=${voteWindowMs} hold_ms=${holdMs} target≈${Math.round((joinRampMs + voteWindowMs + postVotePauseMs + holdMs + speakerCreateSpreadMs + speakerReactSpreadMs + reactionSpreadMs) / 1000)}s`,
);
console.info(
  `[event-load] speaker_create_ratio=${speakerCreateRatio} speaker_react_ratio=${speakerReactRatio} reaction_ratio=${reactionRatio}`,
);

const scriptStartedAt = Date.now();
const joinSchedule = buildJoinSchedule(players, joinRampMs, joinDistribution);
const results = await Promise.all(
  Array.from({ length: players }, (_, i) => makeClient(i, joinSchedule[i] ?? 0)),
);

let failed = 0;
/** @type {Array<typeof results[0]["client"]>} */
const joinedClients = [];
for (const r of results) {
  if (!r.ok) {
    failed += 1;
    bumpReason(joinFailReasons, r.err);
  } else if (r.client?.socket) {
    joinedClients.push(r.client);
  }
}

console.info(`[event-load] joined_ok=${joinedClients.length}/${players}`);
if (failed > 0) {
  console.info(`[event-load] join_fail_reasons ${topReasons(joinFailReasons)}`);
}
logLatencyStats("[event-load] http_bootstrap_ms", httpBootstrapLatencies);
logLatencyStats("[event-load] join_ack_ms", joinLatencies);

let submitOk = 0;
let submitTotal = 0;
let submitSkipped = false;

const target = await resolveSubmitTarget(joinedClients);
if (!target) {
  submitSkipped = true;
  console.warn(
    "[event-load] vote: нет активного вопроса. Откройте вопрос в админке или задайте QUIZ_ID + QUESTION_ID + OPTION_ID.",
  );
} else {
  const n = joinedClients.length;
  const delays = joinedClients.map(() => sampleDelayMs(voteWindowMs, voteDistribution));
  console.info(
    `[event-load] vote_start question=${target.questionId.slice(0, 8)}… voters=${n} window_ms=${voteWindowMs}`,
  );
  const voteResults = await Promise.all(
    joinedClients.map(
      (c, idx) =>
        new Promise((resolve) => {
          const delayMs = delays[idx] ?? 0;
          setTimeout(async () => {
            const stateTarget = resolveSubmitTargetFromState(c.lastState);
            const quizId = target.quizId || stateTarget.quizId || c.quizId;
            const questionId = target.questionId || stateTarget.questionId;
            const question = stateTarget.question || target.question;
            const payload = buildAnswerPayloadFromQuestion(question);
            if (!quizId || !questionId) {
              resolve({ ok: false, err: "no_submit_target" });
              return;
            }
            resolve(await submitAnswer(c.socket, quizId, questionId, payload));
          }, delayMs);
        }),
    ),
  );

  let submitFail = 0;
  submitTotal = n;
  for (const vr of voteResults) {
    if (!vr.ok) {
      submitFail += 1;
      bumpReason(submitFailReasons, vr.err);
    }
  }
  submitOk = n - submitFail;
  console.info(`[event-load] submit_ok=${submitOk}/${n}`);
  if (submitFail > 0) {
    console.info(`[event-load] submit_fail_reasons ${topReasons(submitFailReasons)}`);
  }
  logLatencyStats("[event-load] submit_roundtrip_ms", submitLatencies);

  const submitFailRate = n > 0 ? submitFail / n : 0;
  if (submitFailRate > submitFailMaxRate) {
    console.error(
      `[event-load] submit SLO: fail_rate=${(submitFailRate * 100).toFixed(1)}% > max=${(submitFailMaxRate * 100).toFixed(1)}%`,
    );
  }
}

await sleep(postVotePauseMs);

const createIndices = pickIndicesByRatio(joinedClients.length, speakerCreateRatio);
const reactIndices = pickIndicesByRatio(joinedClients.length, speakerReactRatio);
const reactionIndices = pickIndicesByRatio(joinedClients.length, reactionRatio);

console.info(
  `[event-load] speaker_create=${createIndices.size} speaker_react=${reactIndices.size} reactions=${reactionIndices.size}`,
);

const createTasks = [...createIndices].map(async (idx) => {
  const c = joinedClients[idx];
  if (!c?.socket) return { ok: false, err: "no_client" };
  const quizId = c.quizId || resolveSubmitTargetFromState(c.lastState).quizId;
  if (!quizId) return { ok: false, err: "no_quiz_id" };
  await sleep(sampleDelayMs(speakerCreateSpreadMs, "uniform"));
  const speakerName = pickSpeakerTarget(c.speakers, c.allowAllSpeakers);
  const text = `Вопрос от нагрузки ${idx} — ${Date.now()}`.slice(0, 120);
  const result = await speakerCreate(c.socket, quizId, speakerName, text);
  if (!result.ok) bumpReason(speakerCreateFailReasons, result.err);
  return result;
});

const reactTasks = [...reactIndices].map(async (idx) => {
  const c = joinedClients[idx];
  if (!c?.socket) return { ok: false, err: "no_client" };
  const quizId = c.quizId || resolveSubmitTargetFromState(c.lastState).quizId;
  if (!quizId) return { ok: false, err: "no_quiz_id" };
  const pool =
    speakerQuestionIds.length > 0
      ? speakerQuestionIds
      : c.speakerItems.map((item) => item.id).filter(Boolean);
  if (pool.length === 0) return { ok: false, err: "no_speaker_questions" };
  await sleep(sampleDelayMs(speakerReactSpreadMs, "uniform"));
  const questionId = pool[Math.floor(Math.random() * pool.length)];
  const reaction = c.reactions[Math.floor(Math.random() * c.reactions.length)] || "👍";
  const result = await speakerReact(c.socket, quizId, questionId, reaction);
  if (!result.ok) bumpReason(speakerReactFailReasons, result.err);
  return result;
});

const reactionTasks = [...reactionIndices].map(async (idx) => {
  const c = joinedClients[idx];
  if (!c?.socket) return { ok: false, err: "no_client" };
  const quizId = c.quizId || resolveSubmitTargetFromState(c.lastState).quizId;
  if (!quizId) return { ok: false, err: "no_quiz_id" };
  await sleep(sampleDelayMs(reactionSpreadMs, "uniform"));
  const reactionType = c.reactions[Math.floor(Math.random() * c.reactions.length)] || "👍";
  const result = await reactionToggle(c.socket, quizId, reactionType);
  if (!result.ok) bumpReason(reactionFailReasons, result.err);
  return result;
});

const [createResults, reactResults, reactionResults] = await Promise.all([
  Promise.all(createTasks),
  Promise.all(reactTasks),
  Promise.all(reactionTasks),
]);

const createOk = createResults.filter((r) => r.ok).length;
console.info(`[event-load] speaker_create_ok=${createOk}/${createResults.length}`);
if (createResults.length - createOk > 0) {
  console.info(`[event-load] speaker_create_fail_reasons ${topReasons(speakerCreateFailReasons)}`);
}
logLatencyStats("[event-load] speaker_create_ms", speakerCreateLatencies);

const reactOk = reactResults.filter((r) => r.ok).length;
console.info(`[event-load] speaker_react_ok=${reactOk}/${reactResults.length}`);
if (reactResults.length - reactOk > 0) {
  console.info(`[event-load] speaker_react_fail_reasons ${topReasons(speakerReactFailReasons)}`);
}
logLatencyStats("[event-load] speaker_react_ms", speakerReactLatencies);

const reactionOk = reactionResults.filter((r) => r.ok).length;
console.info(`[event-load] reaction_ok=${reactionOk}/${reactionResults.length}`);
if (reactionResults.length - reactionOk > 0) {
  console.info(`[event-load] reaction_fail_reasons ${topReasons(reactionFailReasons)}`);
}
logLatencyStats("[event-load] reaction_ms", reactionLatencies);

if (holdMs > 0) {
  console.info(`[event-load] hold_ms=${holdMs} (online counter)`);
  await sleep(holdMs);
}

for (const r of results) {
  r.client?.socket?.close();
}

const durationMs = Date.now() - scriptStartedAt;
const submitFailRate =
  submitTotal > 0 ? (submitTotal - submitOk) / submitTotal : submitSkipped ? 1 : 0;

/** @type {string[]} */
const failReasons = [];
if (failed > joinFailTolerance) {
  failReasons.push(
    `join: ${failed} сбоев (допустимо ${joinFailTolerance}) — ${topReasons(joinFailReasons) || "см. лог"}`,
  );
}
if (submitSkipped) {
  failReasons.push("голосование: нет активного вопроса");
} else if (submitTotal > 0 && submitFailRate > submitFailMaxRate) {
  failReasons.push(
    `submit: fail rate ${(submitFailRate * 100).toFixed(1)}% > ${(submitFailMaxRate * 100).toFixed(1)}% — ${topReasons(submitFailReasons) || "см. лог"}`,
  );
}
if (createResults.length > 0 && createOk < createResults.length) {
  failReasons.push(
    `speaker create: ${createOk}/${createResults.length} — ${topReasons(speakerCreateFailReasons) || "см. лог"}`,
  );
}
if (reactResults.length > 0 && reactOk < reactResults.length) {
  failReasons.push(
    `speaker react: ${reactOk}/${reactResults.length} — ${topReasons(speakerReactFailReasons) || "см. лог"}`,
  );
}
if (reactionResults.length > 0 && reactionOk < reactionResults.length) {
  failReasons.push(
    `reactions: ${reactionOk}/${reactionResults.length} — ${topReasons(reactionFailReasons) || "см. лог"}`,
  );
}

const passed = failReasons.length === 0;
process.exitCode = passed ? 0 : 1;

const verdictLabel = passed ? "УСПЕХ" : "ПРОВАЛ";
const durationSec = (durationMs / 1000).toFixed(1);
const submitP95 =
  submitLatencies.length > 0
    ? percentile(
        [...submitLatencies].sort((a, b) => a - b),
        95,
      )
    : null;
const joinP95 =
  joinLatencies.length > 0
    ? percentile(
        [...joinLatencies].sort((a, b) => a - b),
        95,
      )
    : null;

console.info("");
console.info("══════════════════════════════════════════");
console.info(`  ИТОГ ПРОГОНА: ${verdictLabel}`);
console.info("══════════════════════════════════════════");
console.info(`  Профиль:      ${process.env.PROFILE_NAME || "—"}`);
console.info(`  Комната:      ${base}/q/${slug}`);
console.info(`  Длительность: ${durationSec} с`);
console.info(`  Join:         ${joinedClients.length}/${players}`);
if (submitSkipped) {
  console.info("  Голосование:  пропущено (нет вопроса)");
} else {
  console.info(`  Голосование:  ${submitOk}/${submitTotal}`);
}
console.info(
  `  Speaker:      create ${createOk}/${createResults.length}, react ${reactOk}/${reactResults.length}`,
);
console.info(`  Реакции:      ${reactionOk}/${reactionResults.length}`);
if (joinP95 != null) {
  console.info(`  Latency:      join p95=${joinP95} ms, submit p95=${submitP95 ?? "—"} ms`);
}
if (!passed) {
  console.info("  Причины:");
  for (const reason of failReasons) {
    console.info(`    • ${reason}`);
  }
}
console.info("══════════════════════════════════════════");
console.info("");

const summary = {
  profile: process.env.PROFILE_NAME || "",
  baseUrl: base,
  quizSlug: slug,
  players,
  passed,
  verdict: verdictLabel,
  failReasons,
  joinedOk: joinedClients.length,
  joinFailed: failed,
  submitOk,
  submitTotal,
  submitSkipped,
  speakerCreateOk: createOk,
  speakerCreateTotal: createResults.length,
  speakerReactOk: reactOk,
  speakerReactTotal: reactResults.length,
  reactionOk,
  reactionTotal: reactionResults.length,
  durationMs,
  latencies: {
    httpBootstrap: httpBootstrapLatencies,
    joinAck: joinLatencies,
    submit: submitLatencies,
    speakerCreate: speakerCreateLatencies,
    speakerReact: speakerReactLatencies,
    reaction: reactionLatencies,
  },
};

if (summaryOut) {
  const fs = await import("node:fs");
  fs.writeFileSync(summaryOut, JSON.stringify(summary, null, 2));
}
