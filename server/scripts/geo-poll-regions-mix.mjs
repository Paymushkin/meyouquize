/**
 * Локальный тест geo-poll: ~30 регионов, часть городов повторяется (до 4),
 * в части регионов — до 4 городов.
 *
 * Пример:
 *   QUIZ_SLUG=demo npm run loadtest:geo-mix -w server
 *
 * Опции: BASE_URL, QUIZ_SLUG, DICTIONARY, WINDOW_MS, QUESTION_ID
 */
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";

const base = (process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const slug = (process.env.QUIZ_SLUG || "").trim();
const dictionary = (process.env.DICTIONARY || "world_cities").trim();
const windowMs = Math.max(1_000, Number(process.env.WINDOW_MS || 60_000));
const forcedQuestionId = (process.env.QUESTION_ID || "").trim();
const submitTimeoutMs = Math.max(3_000, Number(process.env.SUBMIT_TIMEOUT_MS || 15_000));

/**
 * ~30 регионов. `votes` — сколько раз отправить город (1..4).
 * Несколько городов в одном блоке ≈ один субъект на карте.
 */
const REGION_GROUPS = [
  // Повторы одного города
  { region: "Москва", cities: [{ name: "Москва", votes: 4 }] },
  { region: "Санкт-Петербург", cities: [{ name: "Санкт-Петербург", votes: 3 }] },
  { region: "Новосибирск", cities: [{ name: "Новосибирск", votes: 2 }] },
  { region: "Екатеринбург", cities: [{ name: "Екатеринбург", votes: 3 }] },
  { region: "Казань", cities: [{ name: "Казань", votes: 2 }] },
  { region: "Нижний Новгород", cities: [{ name: "Нижний Новгород", votes: 1 }] },
  { region: "Челябинск", cities: [{ name: "Челябинск", votes: 2 }] },
  { region: "Самара", cities: [{ name: "Самара", votes: 1 }] },
  { region: "Омск", cities: [{ name: "Омск", votes: 1 }] },
  { region: "Ростов-на-Дону", cities: [{ name: "Ростов-на-Дону", votes: 2 }] },
  { region: "Уфа", cities: [{ name: "Уфа", votes: 1 }] },
  { region: "Красноярск", cities: [{ name: "Красноярск", votes: 1 }] },
  { region: "Воронеж", cities: [{ name: "Воронеж", votes: 1 }] },
  { region: "Пермь", cities: [{ name: "Пермь", votes: 1 }] },
  { region: "Волгоград", cities: [{ name: "Волгоград", votes: 1 }] },
  { region: "Краснодар", cities: [{ name: "Краснодар", votes: 2 }] },
  { region: "Тюмень", cities: [{ name: "Тюмень", votes: 1 }] },
  { region: "Иркутск", cities: [{ name: "Иркутск", votes: 1 }] },
  { region: "Хабаровск", cities: [{ name: "Хабаровск", votes: 1 }] },
  { region: "Владивосток", cities: [{ name: "Владивосток", votes: 2 }] },
  { region: "Якутск", cities: [{ name: "Якутск", votes: 1 }] },
  { region: "Калининград", cities: [{ name: "Калининград", votes: 1 }] },
  { region: "Мурманск", cities: [{ name: "Мурманск", votes: 1 }] },
  { region: "Симферополь", cities: [{ name: "Симферополь", votes: 2 }] },
  // Несколько городов в одном регионе (до 4)
  {
    region: "Татарстан",
    cities: [
      { name: "Казань", votes: 1 },
      { name: "Набережные Челны", votes: 2 },
      { name: "Нижнекамск", votes: 1 },
      { name: "Альметьевск", votes: 1 },
    ],
  },
  {
    region: "Краснодарский край",
    cities: [
      { name: "Краснодар", votes: 1 },
      { name: "Сочи", votes: 3 },
      { name: "Новороссийск", votes: 1 },
      { name: "Армавир", votes: 1 },
    ],
  },
  {
    region: "Свердловская область",
    cities: [
      { name: "Екатеринбург", votes: 1 },
      { name: "Нижний Тагил", votes: 2 },
      { name: "Каменск-Уральский", votes: 1 },
    ],
  },
  {
    region: "Ростовская область",
    cities: [
      { name: "Ростов-на-Дону", votes: 1 },
      { name: "Таганрог", votes: 1 },
      { name: "Шахты", votes: 1 },
      { name: "Новочеркасск", votes: 2 },
    ],
  },
  {
    region: "Крым",
    cities: [
      { name: "Симферополь", votes: 1 },
      { name: "Ялта", votes: 2 },
      { name: "Керчь", votes: 1 },
      { name: "Евпатория", votes: 1 },
    ],
  },
  {
    region: "Приморье",
    cities: [
      { name: "Владивосток", votes: 1 },
      { name: "Находка", votes: 1 },
      { name: "Уссурийск", votes: 2 },
    ],
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Перемешать массив (Фишер–Йейтс). */
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

async function resolvePlan() {
  /** @type {Array<{ name: string, key: string, label: string, region: string }>} */
  const votes = [];
  /** @type {string[]} */
  const missed = [];
  const cache = new Map();

  for (const group of REGION_GROUPS) {
    for (const city of group.cities) {
      let hit = cache.get(city.name);
      if (hit === undefined) {
        hit = await searchCity(city.name);
        cache.set(city.name, hit);
      }
      if (!hit?.key) {
        missed.push(`${city.name} (${group.region})`);
        console.warn(`[geo-mix] miss: ${city.name} [${group.region}]`);
        continue;
      }
      const votesCount = Math.max(1, Math.min(4, Math.trunc(city.votes) || 1));
      console.info(
        `[geo-mix] ok: ${city.name} ×${votesCount} → ${hit.label} (${hit.key}) [${group.region}]`,
      );
      for (let i = 0; i < votesCount; i++) {
        votes.push({
          name: city.name,
          key: hit.key,
          label: hit.label,
          region: group.region,
        });
      }
    }
  }
  return { votes: shuffle(votes), missed };
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

function submitOneVote({ quizId, questionId, cityKey, nickname }) {
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
        tagAnswers: [cityKey],
      });
    });

    socket.on("answer:submitted", () => {
      clearTimeout(timer);
      finish({ ok: true });
    });
  });
}

async function main() {
  if (!slug) {
    console.error("[geo-mix] QUIZ_SLUG is required (e.g. QUIZ_SLUG=demo)");
    process.exit(1);
  }

  console.info(`[geo-mix] base=${base} slug=${slug} windowMs=${windowMs}`);
  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");

  const state = await fetchState(quizId);
  const active = state?.activeQuestion;
  const questionId = forcedQuestionId || active?.id;
  if (!questionId) throw new Error("no active question (set QUESTION_ID or enable geo-poll)");
  console.info(
    `[geo-mix] quizId=${quizId} questionId=${questionId} text=${JSON.stringify(active?.text || "")}`,
  );

  const { votes, missed } = await resolvePlan();
  if (votes.length === 0) {
    console.error("[geo-mix] no votes resolved");
    process.exit(1);
  }

  const uniqueCities = new Set(votes.map((v) => v.key)).size;
  const regions = new Set(votes.map((v) => v.region)).size;
  console.info(
    `[geo-mix] regions≈${regions} uniqueCities=${uniqueCities} votes=${votes.length} missed=${missed.length}; sending evenly over ${windowMs}ms`,
  );

  const step = windowMs / votes.length;
  let ok = 0;
  let fail = 0;
  const failReasons = new Map();
  const startedAt = Date.now();

  await Promise.all(
    votes.map(async (vote, index) => {
      const delay = Math.round(index * step);
      await sleep(delay);
      const nickname = `mix_${index + 1}_${vote.name}`.slice(0, 32);
      const result = await submitOneVote({
        quizId,
        questionId,
        cityKey: vote.key,
        nickname,
      });
      const elapsed = Date.now() - startedAt;
      if (result.ok) {
        ok += 1;
        console.info(`[geo-mix] +${elapsed}ms OK ${vote.name} [${vote.region}]`);
      } else {
        fail += 1;
        const reason = result.err || "unknown";
        failReasons.set(reason, (failReasons.get(reason) ?? 0) + 1);
        console.warn(`[geo-mix] +${elapsed}ms FAIL ${vote.name}: ${reason}`);
      }
    }),
  );

  console.info(`[geo-mix] done ok=${ok} fail=${fail} missedResolve=${missed.length}`);
  if (missed.length) console.info(`[geo-mix] missed: ${missed.join(", ")}`);
  if (failReasons.size) {
    console.info(
      `[geo-mix] fail reasons: ${[...failReasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[geo-mix] fatal:", err);
  process.exit(1);
});
