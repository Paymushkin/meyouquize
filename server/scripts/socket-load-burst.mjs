/**
 * Нагрузка Socket.IO (фаза 3 — замеры дашборда):
 * 1) Множество quiz:join (PLAYER_COUNT).
 * 2) Опционально RUN_SUBMIT=1: после join ожидаем state:quiz и шлём answer:submit
 *    с первым optionId активного вопроса (нужен открытый вопрос в комнате).
 * 3) Опционально RUN_DASHBOARD=1: отдельный клиент results:subscribe — считает push
 *    results:dashboard после всплеска submit (ожидается 1–несколько событий при debounce
 *    и single-flight на сервере).
 *
 * Примеры:
 *   BASE_URL=http://localhost:4000 QUIZ_SLUG=room1 node scripts/socket-load-burst.mjs
 *   RUN_SUBMIT=1 SUBMIT_PLAYERS=80 BASE_URL=... QUIZ_SLUG=... node scripts/socket-load-burst.mjs
 *   RUN_SUBMIT=1 RUN_DASHBOARD=1 SUBMIT_PLAYERS=100 BASE_URL=... QUIZ_SLUG=... node scripts/socket-load-burst.mjs
 *
 * Реалистичное голосование (распределение по времени, все онлайн до конца окна):
 *   REALISTIC_VOTE=1 VOTE_WINDOW_MS=60000 SUBMIT_PLAYERS=500 ...
 *   (VOTE_WINDOW_MS по умолчанию 60000, если задан только REALISTIC_VOTE=1)
 *
 * Растягивание подключений (чтобы не убить один процесс Node/Caddy одним мега-handshake):
 *   JOIN_RAMP_MS=45000 — старт каждого следующего клиента равномерно в окне 0..JOIN_RAMP_MS
 *   JOIN_ACK_TIMEOUT_MS=25000 — таймаут ожидания quiz:joined (по умолчанию 15000)
 */
import { io } from "socket.io-client";

const base = process.env.BASE_URL || "http://localhost:4000";
const slug = process.env.QUIZ_SLUG;
const players = Number(process.env.PLAYER_COUNT || 120);
const joinRampMs = Number(process.env.JOIN_RAMP_MS || 0);
const joinDistribution = (process.env.JOIN_DISTRIBUTION || "uniform").trim().toLowerCase();
const joinAckTimeoutMs = Number(process.env.JOIN_ACK_TIMEOUT_MS || 15_000);
/** Повтор handshake при connect_error (один и тот же join в пределах join_ack_timeout). */
const joinConnectRetries = Math.max(1, Number(process.env.JOIN_CONNECT_RETRIES ?? "3"));
const joinConnectBackoffMs = Math.max(0, Number(process.env.JOIN_CONNECT_BACKOFF_MS ?? "400"));
/** Сколько неуспешных join допускаем без exit 1 (0 = строго все должны войти). По умолчанию 1. */
const joinFailToleranceRaw = process.env.JOIN_FAIL_TOLERANCE?.trim();
const joinFailTolerance =
  joinFailToleranceRaw === undefined || joinFailToleranceRaw === ""
    ? 1
    : Math.max(0, Number.parseInt(joinFailToleranceRaw, 10) || 0);
const runSubmit = process.env.RUN_SUBMIT === "1" || process.env.RUN_SUBMIT === "true";
const runDashboard = process.env.RUN_DASHBOARD === "1" || process.env.RUN_DASHBOARD === "true";
const submitPlayers = Number(process.env.SUBMIT_PLAYERS || players);
const submitOnJoin = process.env.SUBMIT_ON_JOIN === "1" || process.env.SUBMIT_ON_JOIN === "true";
const submitDelayMinMs = Math.max(0, Number(process.env.SUBMIT_DELAY_MIN_MS || 1000));
const submitDelayMaxMs = Math.max(
  submitDelayMinMs,
  Number(process.env.SUBMIT_DELAY_MAX_MS || 5000),
);
const dashboardWaitMs = Number(process.env.DASHBOARD_WAIT_MS || 3500);
const holdMs = Number(process.env.HOLD_MS || 0);
const testDurationMs = Math.max(0, Number(process.env.TEST_DURATION_MS || 0));
const submitTimeoutMs = Number(process.env.SUBMIT_TIMEOUT_MS || 12_000);
const runWalkthrough =
  process.env.RUN_WALKTHROUGH === "1" || process.env.RUN_WALKTHROUGH === "true";
const walkthroughTimeoutMs = Number(process.env.WALKTHROUGH_TIMEOUT_MS || 180_000);
const walkthroughVoteWindowMs = Math.max(
  0,
  Number(
    process.env.WALKTHROUGH_VOTE_WINDOW_MS ||
      (runWalkthrough ? Math.max(15_000, Math.min(60_000, Math.floor(players * 150))) : 0),
  ),
);
const walkthroughAutoAdvance =
  process.env.RUN_WALKTHROUGH_AUTO_ADVANCE === "1" ||
  process.env.RUN_WALKTHROUGH_AUTO_ADVANCE === "true";
const walkthroughStepPauseMs = Math.max(250, Number(process.env.WALKTHROUGH_STEP_PAUSE_MS || 900));
const adminLogin = (process.env.ADMIN_LOGIN || "").trim();
const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
const voteWindowMsRaw = Number(process.env.VOTE_WINDOW_MS || 0);
const realisticVoteFlag =
  process.env.REALISTIC_VOTE === "1" || process.env.REALISTIC_VOTE === "true";
const useRealisticVote = realisticVoteFlag || voteWindowMsRaw > 0;
const voteWindowMs = voteWindowMsRaw > 0 ? voteWindowMsRaw : useRealisticVote ? 60_000 : 0;
const voteDistribution = (process.env.VOTE_DISTRIBUTION || "normal").trim().toLowerCase();
const forcedQuizId = (process.env.QUIZ_ID || "").trim();
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const forcedOptionId = (process.env.OPTION_ID || "").trim();

function validateConfig() {
  const issues = [];
  if (!slug) issues.push("QUIZ_SLUG is required");
  if (!Number.isFinite(players) || players <= 0) issues.push("PLAYER_COUNT must be > 0");
  if (!Number.isFinite(submitPlayers) || submitPlayers < 0) {
    issues.push("SUBMIT_PLAYERS must be >= 0");
  }
  if (submitDelayMaxMs < submitDelayMinMs) {
    issues.push("SUBMIT_DELAY_MAX_MS must be >= SUBMIT_DELAY_MIN_MS");
  }
  if (!["uniform", "normal"].includes(joinDistribution)) {
    issues.push("JOIN_DISTRIBUTION must be one of: uniform, normal");
  }
  if (!["uniform", "normal"].includes(voteDistribution)) {
    issues.push("VOTE_DISTRIBUTION must be one of: uniform, normal");
  }
  return issues;
}

const configIssues = validateConfig();
if (configIssues.length > 0) {
  for (const issue of configIssues) {
    console.error(`[socket-load] config error: ${issue}`);
  }
  process.exit(1);
}

if (!slug) {
  console.error("Задайте QUIZ_SLUG (slug комнаты / квиза).");
  process.exit(1);
}

console.info(
  `[socket-load] join_connect_retries=${joinConnectRetries} backoff_ms=${joinConnectBackoffMs} join_fail_tolerance=${joinFailTolerance}`,
);

const joinLatencies = [];
const submitLatencies = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bumpReason(map, reason) {
  const key = (reason || "unknown").toString();
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printTopReasons(prefix, map) {
  if (map.size === 0) return;
  const top = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reason, count]) => `${reason}:${count}`)
    .join(", ");
  console.info(`${prefix} ${top}`);
}

/** N(0,1) через Box–Muller */
function randomStdNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Случайная задержка в [0, windowMs): по умолчанию нормальное распределение вокруг середины окна. */
function sampleVoteDelayMs(windowMs) {
  if (windowMs <= 1) return 0;
  if (voteDistribution === "uniform") {
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

function sampleJoinDelayMs(windowMs) {
  if (windowMs <= 1) return 0;
  if (joinDistribution === "normal") {
    const mean = windowMs / 2;
    const std = windowMs / 6;
    for (let k = 0; k < 24; k += 1) {
      const x = mean + std * randomStdNormal();
      if (x >= 0 && x < windowMs) return Math.floor(x);
    }
  }
  return Math.floor(Math.random() * windowMs);
}

function randomIntBetween(min, max) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildJoinSchedule(totalPlayers) {
  if (joinRampMs <= 0) return Array.from({ length: totalPlayers }, () => 0);
  return Array.from({ length: totalPlayers }, () => sampleJoinDelayMs(joinRampMs));
}

function resolveSubmitTargetFromState(state) {
  const quizId = typeof state?.id === "string" ? state.id : "";
  const question = state?.activeQuestion;
  const questionId = typeof question?.id === "string" ? question.id : "";
  const optionId = question?.options?.[0]?.id;
  return {
    quizId,
    questionId,
    optionId: typeof optionId === "string" ? optionId : "",
  };
}

function pickN(list, n) {
  if (n <= 0) return [];
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function buildAnswerPayloadFromStateQuestion(question) {
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
    // Для ranking сервер ждёт rankedOptionIds (полный порядок), не optionIds.
    return { rankedOptionIds: pickN(optionIds, optionIds.length) };
  }
  if (qType === "tag_cloud") {
    const tags = pickN(
      optionTexts.length > 0 ? optionTexts : ["тест", "квиз", "demo", "нагрузка"],
      Math.max(1, Math.min(3, optionTexts.length || 3)),
    );
    return { optionIds: [], tagAnswers: tags };
  }

  return { optionIds: optionIds.length > 0 ? [optionIds[0]] : [] };
}

function extractCookieValue(setCookieHeaders, name) {
  if (!Array.isArray(setCookieHeaders)) return "";
  for (const raw of setCookieHeaders) {
    const firstPart = String(raw || "").split(";")[0] || "";
    if (firstPart.startsWith(`${name}=`)) {
      return firstPart.slice(name.length + 1);
    }
  }
  return "";
}

async function connectAdminControlSocket() {
  if (!adminLogin || !adminPassword) {
    throw new Error("RUN_WALKTHROUGH_AUTO_ADVANCE requires ADMIN_LOGIN and ADMIN_PASSWORD");
  }
  const authUrl = new URL("/api/admin/auth", base).toString();
  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: adminLogin, password: adminPassword }),
  });
  if (!res.ok) {
    throw new Error(`admin auth failed: HTTP ${res.status}`);
  }
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const token = extractCookieValue(setCookies, "mq_admin");
  if (!token) throw new Error("admin auth cookie mq_admin missing");

  return new Promise((resolve, reject) => {
    const adminSocket = io(base, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: {
        Cookie: `mq_admin=${token}`,
      },
    });
    const timer = setTimeout(() => {
      adminSocket.close();
      reject(new Error("admin control socket timeout"));
    }, 15_000);
    adminSocket.once("connect", () => {
      clearTimeout(timer);
      resolve(adminSocket);
    });
    adminSocket.once("connect_error", (err) => {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

function connectObserver(dashTimes) {
  return new Promise((resolve, reject) => {
    const s = io(base, { transports: ["websocket"], reconnection: false });
    s.on("results:dashboard", () => dashTimes.push(Date.now()));
    const to = setTimeout(() => {
      s.close();
      reject(new Error("observer_timeout (нет results:dashboard после subscribe)"));
    }, 20_000);
    s.on("connect", () => {
      s.emit("results:subscribe", { slug, viewer: "projector" });
    });
    s.once("results:dashboard", () => {
      clearTimeout(to);
      resolve(s);
    });
    s.once("connect_error", (err) => {
      clearTimeout(to);
      reject(err);
    });
    s.once("error:message", (e) => {
      clearTimeout(to);
      reject(new Error(e?.message || "observer_error:message"));
    });
  });
}

function makeClient(i, startDelayMs = 0, ackTimeoutMs = joinAckTimeoutMs) {
  return new Promise((resolve) => {
    let globalTimer = null;
    let activeSocket = null;
    const nickname = `load_${i}_${Date.now()}`;
    const deviceId = `dev_${i}_${Math.random().toString(36).slice(2)}`;

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
    }

    let handshakeAttempt = 0;

    function startHandshakeAttempt() {
      cleanupActiveSocket();
      handshakeAttempt += 1;
      if (handshakeAttempt > joinConnectRetries) {
        finish({ ok: false, err: "connect_error", client: { socket: null, lastState: null } });
        return;
      }

      const s = io(base, { transports: ["websocket"], reconnection: false });
      activeSocket = s;
      const client = { socket: s, lastState: null };

      s.on("state:quiz", (state) => {
        client.lastState = state;
      });

      s.on("connect", () => {
        const t0 = Date.now();
        s.emit("quiz:join", { slug, nickname, deviceId });
        s.once("quiz:joined", () => {
          joinLatencies.push(Date.now() - t0);
        });
      });

      s.once("quiz:joined", () => {
        finish({ ok: true, client });
      });

      s.once("error:message", (e) => {
        finish({ ok: false, err: e?.message, client });
      });

      s.once("connect_error", (err) => {
        if (handshakeAttempt < joinConnectRetries) {
          console.warn(
            `[socket-load] client ${i} connect_error (${handshakeAttempt}/${joinConnectRetries}) ${err?.message || err}; retry in ${joinConnectBackoffMs}ms`,
          );
          setTimeout(startHandshakeAttempt, joinConnectBackoffMs);
        } else {
          finish({ ok: false, err: "connect_error", client });
        }
      });
    }

    const start = () => {
      globalTimer = setTimeout(() => {
        cleanupActiveSocket();
        finish({
          ok: false,
          err: "timeout",
          client: activeSocket ? { socket: activeSocket, lastState: null } : null,
        });
      }, ackTimeoutMs);
      startHandshakeAttempt();
    };

    if (startDelayMs > 0) setTimeout(start, startDelayMs);
    else start();
  });
}

function submitAnswer(socket, quizId, questionId, answerPayload, ackTimeoutMs = submitTimeoutMs) {
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
    timer = setTimeout(() => finish(false, "submit_timeout"), ackTimeoutMs);
    socket.on("answer:submitted", onOk);
    socket.on("error:message", onErr);
    socket.emit("answer:submit", {
      quizId,
      questionId,
      ...answerPayload,
    });
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function resolveSubmitTarget(joinedClients, timeoutMs = 10_000) {
  if (forcedQuizId && forcedQuestionId && forcedOptionId) {
    return {
      quizId: forcedQuizId,
      questionId: forcedQuestionId,
      optionId: forcedOptionId,
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

async function resolveSubmitTargetForClient(client, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const target = resolveSubmitTargetFromState(client?.lastState);
    if (target.quizId && target.questionId && target.optionId) {
      return target;
    }
    await sleep(200);
  }
  return null;
}

function collectJoinStats(resultsList) {
  let failedCount = 0;
  const joined = [];
  const failReasons = new Map();
  for (const r of resultsList) {
    if (!r.ok) {
      failedCount += 1;
      bumpReason(failReasons, r.err);
    } else {
      joined.push(r.client);
    }
  }
  return { failedCount, joined, failReasons };
}

function collectSubmitStats(submitResults) {
  let failedCount = 0;
  const failReasons = new Map();
  for (const sr of submitResults) {
    if (!sr.ok) {
      failedCount += 1;
      bumpReason(failReasons, sr.err);
    }
  }
  return { failedCount, failReasons };
}

function logLatencyStats(prefix, latencies) {
  if (latencies.length === 0) return;
  const sorted = [...latencies].sort((a, b) => a - b);
  console.info(
    `${prefix} p50=${percentile(sorted, 50)} p95=${percentile(sorted, 95)} max=${sorted[sorted.length - 1]}`,
  );
}

async function runSubmitOnJoinFlow(submitOnJoinTasks) {
  if (!(submitOnJoin && runSubmit && submitOnJoinTasks.length > 0)) return 0;
  const submitResults = await Promise.all(submitOnJoinTasks);
  const { failedCount: submitFail, failReasons: submitFailReasons } =
    collectSubmitStats(submitResults);
  console.info(
    `[socket-load] submit_on_join_ok=${submitResults.length - submitFail}/${submitResults.length}`,
  );
  if (submitFail > 0) {
    printTopReasons("[socket-load] submit_on_join_fail_reasons", submitFailReasons);
  }
  logLatencyStats("[socket-load] submit_roundtrip_ms", submitLatencies);
  return Date.now();
}

async function runBulkSubmitFlow(joinedClients) {
  if (!(runSubmit && joinedClients.length > 0)) return 0;
  const resolveTargetMs = joinRampMs > 0 ? 20_000 : 12_000;
  const target = await resolveSubmitTarget(joinedClients, resolveTargetMs);
  if (!target) {
    console.warn(
      "[socket-load] RUN_SUBMIT: нет quizId/questionId/optionId. Укажите QUIZ_ID + QUESTION_ID + OPTION_ID или откройте активный вопрос.",
    );
    return 0;
  }

  const n = Math.min(submitPlayers, joinedClients.length);
  if (n < submitPlayers) {
    console.warn(
      `[socket-load] RUN_SUBMIT: SUBMIT_PLAYERS=${submitPlayers}, но в join только ${joinedClients.length} — голосуют ${n}.`,
    );
  }

  let submitResults;
  if (useRealisticVote && voteWindowMs > 0) {
    console.info(
      `[socket-load] realistic_vote window_ms=${voteWindowMs} voters=${n} distribution=${voteDistribution} submit_timeout_ms=${submitTimeoutMs}`,
    );
    const delays = [];
    for (let i = 0; i < n; i += 1) delays.push(sampleVoteDelayMs(voteWindowMs));
    delays.sort((a, b) => a - b);
    console.info(
      `[socket-load] vote_schedule_delay_ms p50=${percentile([...delays], 50)} p95=${percentile([...delays], 95)} max=${delays[delays.length - 1]}`,
    );
    submitResults = await Promise.all(
      joinedClients.slice(0, n).map(
        (c, idx) =>
          new Promise((resolve) => {
            const delayMs = delays[idx] ?? 0;
            setTimeout(() => {
              const payload = { optionIds: target.optionId ? [target.optionId] : [] };
              submitAnswer(
                c.socket,
                target.quizId,
                target.questionId,
                payload,
                submitTimeoutMs,
              ).then(resolve);
            }, delayMs);
          }),
      ),
    );
  } else {
    submitResults = await Promise.all(
      joinedClients.slice(0, n).map((c) => {
        const payload = { optionIds: target.optionId ? [target.optionId] : [] };
        return submitAnswer(c.socket, target.quizId, target.questionId, payload, submitTimeoutMs);
      }),
    );
  }

  const { failedCount: submitFail, failReasons: submitFailReasons } =
    collectSubmitStats(submitResults);
  console.info(
    `[socket-load] submit_ok=${n - submitFail}/${n} (question=${target.questionId.slice(0, 8)}…, source=${target.source})`,
  );
  if (submitFail > 0) {
    printTopReasons("[socket-load] submit_fail_reasons", submitFailReasons);
  }
  logLatencyStats("[socket-load] submit_roundtrip_ms", submitLatencies);
  return Date.now();
}

async function runWalkthroughFlow(joinedClients) {
  if (!(runWalkthrough && joinedClients.length > 0)) return;
  let adminControlSocket = null;
  if (walkthroughAutoAdvance) {
    try {
      adminControlSocket = await connectAdminControlSocket();
      console.info("[socket-load] walkthrough auto-advance: admin control socket connected");
    } catch (e) {
      console.error(
        `[socket-load] walkthrough auto-advance failed: ${e?.message || e}. Continuing without auto-advance.`,
      );
    }
  }

  console.info(
    `[socket-load] walkthrough start voters=${joinedClients.length} timeout_ms=${walkthroughTimeoutMs} vote_window_ms=${walkthroughVoteWindowMs}`,
  );
  const answeredQuestionIds = new Set();
  const walkthroughStart = Date.now();
  let walkthroughSubmitOk = 0;
  let walkthroughSubmitFail = 0;
  const walkthroughFailReasons = new Map();

  while (Date.now() - walkthroughStart < walkthroughTimeoutMs) {
    let targetState = null;
    let targetQuestion = null;
    for (const c of joinedClients) {
      const state = c.lastState;
      const fromList = Array.isArray(state?.activeQuestions) ? state.activeQuestions : [];
      for (const q of fromList) {
        if (q?.id && !answeredQuestionIds.has(q.id)) {
          targetState = state;
          targetQuestion = q;
          break;
        }
      }
      if (!targetQuestion) {
        const q = state?.activeQuestion;
        if (q?.id && !answeredQuestionIds.has(q.id)) {
          targetState = state;
          targetQuestion = q;
        }
      }
      if (targetQuestion) break;
    }

    if (!targetState || !targetQuestion?.id) {
      await sleep(250);
      continue;
    }

    const question = targetQuestion;
    const quizId = targetState.id;
    const questionId = question.id;
    const subQuizId = targetState?.quizProgress?.subQuizId;
    const answerPayload = buildAnswerPayloadFromStateQuestion(question);
    const delays = joinedClients.map(() => sampleVoteDelayMs(walkthroughVoteWindowMs));
    const round = await Promise.all(
      joinedClients.map(
        (c, idx) =>
          new Promise((resolve) => {
            const delayMs = delays[idx] ?? 0;
            setTimeout(() => {
              submitAnswer(c.socket, quizId, questionId, answerPayload, submitTimeoutMs).then(
                resolve,
              );
            }, delayMs);
          }),
      ),
    );

    answeredQuestionIds.add(questionId);
    for (const r of round) {
      if (r.ok) walkthroughSubmitOk += 1;
      else {
        walkthroughSubmitFail += 1;
        bumpReason(walkthroughFailReasons, r.err);
      }
    }
    console.info(
      `[socket-load] walkthrough question_done id=${questionId.slice(0, 8)}… type=${question.type} ok=${round.filter((r) => r.ok).length}/${round.length}`,
    );

    if (adminControlSocket && walkthroughAutoAdvance) {
      try {
        adminControlSocket.emit("question:close", { quizId, questionId });
        await sleep(Math.floor(walkthroughStepPauseMs / 2));
        adminControlSocket.emit("question:activate", { quizId, subQuizId });
      } catch {
        // keep walkthrough running even if control channel has intermittent issues
      }
    }

    await sleep(walkthroughStepPauseMs);
  }

  console.info(
    `[socket-load] walkthrough_done questions=${answeredQuestionIds.size} submit_ok=${walkthroughSubmitOk} submit_fail=${walkthroughSubmitFail}`,
  );
  if (walkthroughSubmitFail > 0) {
    printTopReasons("[socket-load] walkthrough_fail_reasons", walkthroughFailReasons);
  }
  if (adminControlSocket) adminControlSocket.close();
}

const dashboardTimestamps = [];
const scriptStartedAt = Date.now();
let observerSocket = null;
if (runDashboard) {
  try {
    observerSocket = await connectObserver(dashboardTimestamps);
    console.info(
      `[socket-load] observer results:subscribe ok, dashboard_events_total=${dashboardTimestamps.length}`,
    );
  } catch (e) {
    console.error("[socket-load] RUN_DASHBOARD: не удалось подписаться:", e?.message || e);
    process.exit(1);
  }
}

if (joinRampMs > 0) {
  console.info(
    `[socket-load] join_ramp_ms=${joinRampMs} join_distribution=${joinDistribution} join_ack_timeout_ms=${joinAckTimeoutMs} (staggered connect)`,
  );
} else {
  console.info(`[socket-load] join_ack_timeout_ms=${joinAckTimeoutMs}`);
}

if (submitOnJoin && runSubmit) {
  console.info(
    `[socket-load] submit_on_join=true delay_ms=${submitDelayMinMs}..${submitDelayMaxMs}`,
  );
}

const submitOnJoinTasks = [];
const joinSchedule = buildJoinSchedule(players);
const results = await Promise.all(
  Array.from({ length: players }, (_, i) => {
    const delay = joinSchedule[i] ?? 0;
    const joinPromise = makeClient(i, delay, joinAckTimeoutMs);
    if (submitOnJoin && runSubmit && i < submitPlayers) {
      submitOnJoinTasks.push(
        joinPromise.then(async (r) => {
          if (!r.ok || !r.client?.socket) return { ok: false, err: r.err || "join_failed" };
          const target = await resolveSubmitTargetForClient(r.client, 12_000);
          if (!target) return { ok: false, err: "submit_target_not_found" };
          const perClientDelayMs = randomIntBetween(submitDelayMinMs, submitDelayMaxMs);
          if (perClientDelayMs > 0) await sleep(perClientDelayMs);
          return submitAnswer(
            r.client.socket,
            target.quizId,
            target.questionId,
            { optionIds: target.optionId ? [target.optionId] : [] },
            submitTimeoutMs,
          );
        }),
      );
    }
    return joinPromise;
  }),
);

const {
  failedCount: failed,
  joined: joinedClients,
  failReasons: joinFailReasons,
} = collectJoinStats(results);
console.info(`[socket-load] joined_ok=${players - failed}/${players}`);
if (failed > 0) {
  printTopReasons("[socket-load] join_fail_reasons", joinFailReasons);
}
if (joinLatencies.length > 0) {
  const j = [...joinLatencies].sort((a, b) => a - b);
  console.info(
    `[socket-load] join_ack_ms p50=${percentile(j, 50)} p95=${percentile(j, 95)} max=${j[j.length - 1]}`,
  );
}

let submitEndedAt = 0;

submitEndedAt = await runSubmitOnJoinFlow(submitOnJoinTasks);
if (submitEndedAt === 0) {
  submitEndedAt = await runBulkSubmitFlow(joinedClients);
}
await runWalkthroughFlow(joinedClients);

if (runDashboard && observerSocket && submitEndedAt > 0) {
  await sleep(dashboardWaitMs);
  const afterBurst = dashboardTimestamps.filter((t) => t > submitEndedAt);
  console.info(
    `[socket-load] dashboard_pushes_after_submit_burst count=${afterBurst.length} (waited_ms=${dashboardWaitMs})`,
  );
  if (afterBurst.length > 0) {
    console.info(
      `[socket-load] first_dashboard_after_submit_ms=${afterBurst[0] - submitEndedAt} last_delta_ms=${afterBurst[afterBurst.length - 1] - submitEndedAt}`,
    );
  }
  console.info(`[socket-load] dashboard_events_total=${dashboardTimestamps.length}`);
}

if (testDurationMs > 0) {
  const elapsedMs = Date.now() - scriptStartedAt;
  const remainingMs = Math.max(0, testDurationMs - elapsedMs);
  console.info(
    `[socket-load] test_duration_ms=${testDurationMs} elapsed_ms=${elapsedMs} wait_remaining_ms=${remainingMs}`,
  );
  if (remainingMs > 0) await sleep(remainingMs);
}

if (holdMs > 0) {
  console.info(
    `[socket-load] hold connections for ${holdMs} ms (for online counter / live observation)`,
  );
  await sleep(holdMs);
}

if (observerSocket) observerSocket.close();

for (const r of results) {
  r.client?.socket?.close();
}

if (failed > joinFailTolerance) {
  process.exitCode = 1;
  console.error(
    `[socket-load] join SLO: ${failed} сбоев > tolerance=${joinFailTolerance} (JOIN_FAIL_TOLERANCE)`,
  );
} else {
  if (failed > 0) {
    console.warn(
      `[socket-load] join SLO: ${failed} сбоев в пределах tolerance=${joinFailTolerance} — exit 0`,
    );
  }
  console.info("[socket-load] join SLO: без ошибок при заданном PLAYER_COUNT — условно пройдено.");
}
