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
 */
import { io } from "socket.io-client";

const base = process.env.BASE_URL || "http://localhost:4000";
const slug = process.env.QUIZ_SLUG;
const players = Number(process.env.PLAYER_COUNT || 120);
const runSubmit = process.env.RUN_SUBMIT === "1" || process.env.RUN_SUBMIT === "true";
const runDashboard = process.env.RUN_DASHBOARD === "1" || process.env.RUN_DASHBOARD === "true";
const submitPlayers = Number(process.env.SUBMIT_PLAYERS || players);
const dashboardWaitMs = Number(process.env.DASHBOARD_WAIT_MS || 3500);

if (!slug) {
  console.error("Задайте QUIZ_SLUG (slug комнаты / квиза).");
  process.exit(1);
}

const joinLatencies = [];
const submitLatencies = [];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
      s.emit("results:subscribe", { slug });
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

function makeClient(i) {
  return new Promise((resolve) => {
    const s = io(base, { transports: ["websocket"], reconnection: false });
    const nickname = `load_${i}_${Date.now()}`;
    const deviceId = `dev_${i}_${Math.random().toString(36).slice(2)}`;
    s.on("connect", () => {
      const t0 = Date.now();
      s.emit("quiz:join", { slug, nickname, deviceId });
      s.once("quiz:joined", () => {
        joinLatencies.push(Date.now() - t0);
      });
    });
    s.on("quiz:joined", () => {
      resolve({ ok: true, socket: s });
    });
    s.on("error:message", (e) => {
      resolve({ ok: false, err: e?.message, socket: s });
    });
    s.on("connect_error", () => {
      resolve({ ok: false, err: "connect_error", socket: s });
    });
    setTimeout(() => resolve({ ok: false, err: "timeout", socket: s }), 15_000);
  });
}

function waitQuizState(socket, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    const onState = (state) => {
      clearTimeout(t);
      socket.off("state:quiz", onState);
      resolve(state);
    };
    socket.on("state:quiz", onState);
  });
}

function submitAnswer(socket, quizId, questionId, optionId) {
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
    timer = setTimeout(() => finish(false, "submit_timeout"), 12_000);
    socket.on("answer:submitted", onOk);
    socket.on("error:message", onErr);
    socket.emit("answer:submit", {
      quizId,
      questionId,
      optionIds: optionId ? [optionId] : [],
    });
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

const dashboardTimestamps = [];
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

const results = await Promise.all(Array.from({ length: players }, (_, i) => makeClient(i)));

let failed = 0;
const joinedSockets = [];
for (const r of results) {
  if (!r.ok) failed += 1;
  else joinedSockets.push(r.socket);
}
console.info(`[socket-load] joined_ok=${players - failed}/${players}`);
if (joinLatencies.length > 0) {
  const j = [...joinLatencies].sort((a, b) => a - b);
  console.info(
    `[socket-load] join_ack_ms p50=${percentile(j, 50)} p95=${percentile(j, 95)} max=${j[j.length - 1]}`,
  );
}

let submitEndedAt = 0;

if (runSubmit && joinedSockets.length > 0) {
  const probe = joinedSockets[0];
  const state = await waitQuizState(probe, 8000);
  const q = state?.activeQuestion;
  const quizId = state?.id;
  if (!quizId || !q?.id || !q.options?.length) {
    console.warn(
      "[socket-load] RUN_SUBMIT: нет активного вопроса с вариантами в state:quiz — фаза submit пропущена.",
    );
  } else {
    const optionId = q.options[0].id;
    const n = Math.min(submitPlayers, joinedSockets.length);
    const submitResults = await Promise.all(
      joinedSockets.slice(0, n).map((sock) => submitAnswer(sock, quizId, q.id, optionId)),
    );
    submitEndedAt = Date.now();
    let submitFail = 0;
    for (const sr of submitResults) {
      if (!sr.ok) submitFail += 1;
    }
    console.info(`[socket-load] submit_ok=${n - submitFail}/${n} (question=${q.id.slice(0, 8)}…)`);
    if (submitLatencies.length > 0) {
      const s = [...submitLatencies].sort((a, b) => a - b);
      console.info(
        `[socket-load] submit_roundtrip_ms p50=${percentile(s, 50)} p95=${percentile(s, 95)} max=${s[s.length - 1]}`,
      );
    }
  }
}

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

if (observerSocket) observerSocket.close();

for (const r of results) {
  r.socket?.close();
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.info("[socket-load] join SLO: без ошибок при заданном PLAYER_COUNT — условно пройдено.");
}
