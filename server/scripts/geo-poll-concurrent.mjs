/**
 * Geo-poll: N одновременных Socket.IO соединений + N голосов.
 *
 *   BASE_URL=https://meyou.site QUIZ_SLUG=alfa2-2 PLAYER_COUNT=300 \
 *     npm run loadtest:geo-n -w server
 *
 * Опции: DICTIONARY, QUESTION_ID, JOIN_RAMP_MS, VOTE_WINDOW_MS, HOLD_MS, SUBMIT_TIMEOUT_MS
 */
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";

const base = (process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const slug = (process.env.QUIZ_SLUG || "").trim();
const dictionary = (process.env.DICTIONARY || "world_cities").trim();
const players = Math.max(1, Number(process.env.PLAYER_COUNT || 300));
const joinRampMs = Math.max(0, Number(process.env.JOIN_RAMP_MS || 20_000));
const voteWindowMs = Math.max(1_000, Number(process.env.VOTE_WINDOW_MS || 63_000));
const holdMs = Math.max(0, Number(process.env.HOLD_MS || 30_000));
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const submitTimeoutMs = Math.max(3_000, Number(process.env.SUBMIT_TIMEOUT_MS || 45_000));

const CITY_POOL = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Омск",
  "Ростов-на-Дону",
  "Уфа",
  "Красноярск",
  "Воронеж",
  "Пермь",
  "Волгоград",
  "Краснодар",
  "Тюмень",
  "Иркутск",
  "Хабаровск",
  "Владивосток",
  "Якутск",
  "Калининград",
  "Мурманск",
  "Симферополь",
  "Сочи",
  "Тольятти",
  "Барнаул",
  "Ижевск",
  "Улан-Удэ",
  "Махачкала",
  "Томск",
  "Кемерово",
  "Новокузнецк",
  "Рязань",
  "Астрахань",
  "Пенза",
  "Липецк",
  "Киров",
  "Чебоксары",
  "Калуга",
  "Тула",
  "Курск",
  "Ставрополь",
  "Белгород",
  "Севастополь",
  "Магнитогорск",
  "Сургут",
  "Нижневартовск",
  "Ярославль",
  "Владимир",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sampleDelay(windowMs) {
  if (windowMs <= 1) return 0;
  return Math.floor(Math.random() * windowMs);
}

async function searchCity(name) {
  const url = new URL("/api/geo-poll/search", base);
  url.searchParams.set("dictionary", dictionary);
  url.searchParams.set("q", name);
  url.searchParams.set("limit", "5");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search_http_${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const exact = items.find((item) => {
    const label = String(item?.label || "");
    const cityPart = label.split(",")[0]?.trim() || "";
    return cityPart.toLowerCase() === name.toLowerCase();
  });
  return exact || items[0] || null;
}

async function resolveCityKeys() {
  /** @type {Array<{ name: string, key: string, label: string }>} */
  const keys = [];
  for (const name of CITY_POOL) {
    const hit = await searchCity(name);
    if (!hit?.key) {
      console.warn(`[geo-n] miss: ${name}`);
      continue;
    }
    keys.push({ name, key: hit.key, label: hit.label });
  }
  if (keys.length === 0) throw new Error("no cities resolved from dictionary");
  return keys;
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

function connectAndJoin(index) {
  return new Promise((resolve) => {
    const nickname = `g300_${index + 1}`.slice(0, 32);
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

function submitVote(socket, quizId, questionId, cityKey) {
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
      tagAnswers: [cityKey],
    });
  });
}

async function main() {
  if (!slug) {
    console.error("[geo-n] QUIZ_SLUG is required");
    process.exit(1);
  }

  console.info(
    `[geo-n] base=${base} slug=${slug} players=${players} join_ramp_ms=${joinRampMs} vote_window_ms=${voteWindowMs} hold_ms=${holdMs}`,
  );

  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");
  const state = await fetchState(quizId);
  const questionId = forcedQuestionId || state?.activeQuestion?.id;
  if (!questionId) throw new Error("no active question (set QUESTION_ID or enable geo-poll)");
  console.info(
    `[geo-n] quizId=${quizId} questionId=${questionId} text=${JSON.stringify(state?.activeQuestion?.text || "")}`,
  );

  const cities = await resolveCityKeys();
  console.info(`[geo-n] city pool=${cities.length}`);

  const startedAt = Date.now();
  console.info(`[geo-n] connecting ${players} sockets…`);

  const clients = await Promise.all(
    Array.from({ length: players }, async (_, i) => {
      await sleep(joinRampMs > 0 ? Math.floor((i / players) * joinRampMs) : 0);
      return connectAndJoin(i);
    }),
  );

  const joined = clients.filter((c) => c.ok && c.socket?.connected);
  const joinFail = clients.length - joined.length;
  console.info(`[geo-n] joined_ok=${joined.length}/${players} (+${Date.now() - startedAt}ms)`);
  if (joinFail > 0) {
    const reasons = new Map();
    for (const c of clients) {
      if (c.ok) continue;
      reasons.set(c.err || "unknown", (reasons.get(c.err || "unknown") ?? 0) + 1);
    }
    console.warn(
      `[geo-n] join_fail=${joinFail} reasons=${[...reasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }

  console.info(`[geo-n] voting ${joined.length} over ${voteWindowMs}ms…`);
  const voteResults = await Promise.all(
    joined.map(async (c, idx) => {
      await sleep(sampleDelay(voteWindowMs));
      const city = cities[idx % cities.length];
      const result = await submitVote(c.socket, quizId, questionId, city.key);
      return { ...result, city: city.name, nickname: c.nickname };
    }),
  );

  let voteOk = 0;
  const failReasons = new Map();
  for (const r of voteResults) {
    if (r.ok) voteOk += 1;
    else failReasons.set(r.err || "unknown", (failReasons.get(r.err || "unknown") ?? 0) + 1);
  }
  console.info(`[geo-n] submit_ok=${voteOk}/${joined.length} (+${Date.now() - startedAt}ms)`);
  if (failReasons.size) {
    console.warn(
      `[geo-n] submit_fail reasons=${[...failReasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }

  const live = joined.filter((c) => c.socket?.connected).length;
  console.info(`[geo-n] holding ${live} live connections for ${holdMs}ms…`);
  await sleep(holdMs);

  const stillLive = joined.filter((c) => c.socket?.connected).length;
  console.info(`[geo-n] connections_after_hold=${stillLive}`);

  for (const c of clients) {
    try {
      c.socket?.close();
    } catch {
      // ignore
    }
  }

  console.info(
    `[geo-n] done in ${Date.now() - startedAt}ms join_ok=${joined.length}/${players} vote_ok=${voteOk}/${joined.length} held=${stillLive}`,
  );

  if (joined.length < players * 0.95 || voteOk < joined.length * 0.95) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[geo-n] fatal:", err);
  process.exit(1);
});
