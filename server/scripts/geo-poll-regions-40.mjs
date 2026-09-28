/**
 * Локальный тест geo-poll: 40 субъектов РФ.
 * — повтор одного города ≤ 3
 * — городов в одном регионе ≤ 3
 * — всего ответов ≤ 90
 * Длительность по умолчанию 60с.
 *
 * Пример:
 *   QUIZ_SLUG=demo npm run loadtest:geo-40 -w server
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

const MAX_CITY_VOTES = 3;
const MAX_CITIES_PER_REGION = 3;
const MAX_TOTAL_VOTES = 90;
const EXPECTED_REGIONS = 40;

/**
 * 40 субъектов. `votes` — сколько раз отправить город (1..3).
 * Несколько городов в одном блоке ≈ один субъект на карте (до 3).
 */
const REGION_GROUPS = [
  { region: "Москва", cities: [{ name: "Москва", votes: 3 }] },
  { region: "Санкт-Петербург", cities: [{ name: "Санкт-Петербург", votes: 3 }] },
  { region: "Севастополь", cities: [{ name: "Севастополь", votes: 2 }] },
  {
    region: "Татарстан",
    cities: [
      { name: "Казань", votes: 2 },
      { name: "Набережные Челны", votes: 1 },
      { name: "Нижнекамск", votes: 1 },
    ],
  },
  {
    region: "Башкортостан",
    cities: [
      { name: "Уфа", votes: 2 },
      { name: "Стерлитамак", votes: 1 },
    ],
  },
  {
    region: "Краснодарский край",
    cities: [
      { name: "Краснодар", votes: 2 },
      { name: "Сочи", votes: 3 },
      { name: "Новороссийск", votes: 1 },
    ],
  },
  {
    region: "Свердловская область",
    cities: [
      { name: "Екатеринбург", votes: 2 },
      { name: "Нижний Тагил", votes: 1 },
      { name: "Каменск-Уральский", votes: 1 },
    ],
  },
  {
    region: "Ростовская область",
    cities: [
      { name: "Ростов-на-Дону", votes: 2 },
      { name: "Таганрог", votes: 1 },
      { name: "Шахты", votes: 1 },
    ],
  },
  {
    region: "Челябинская область",
    cities: [
      { name: "Челябинск", votes: 2 },
      { name: "Магнитогорск", votes: 1 },
    ],
  },
  {
    region: "Самарская область",
    cities: [
      { name: "Самара", votes: 2 },
      { name: "Тольятти", votes: 1 },
    ],
  },
  {
    region: "Крым",
    cities: [
      { name: "Симферополь", votes: 2 },
      { name: "Ялта", votes: 1 },
      { name: "Керчь", votes: 1 },
    ],
  },
  {
    region: "Приморский край",
    cities: [
      { name: "Владивосток", votes: 2 },
      { name: "Уссурийск", votes: 1 },
    ],
  },
  {
    region: "Московская область",
    cities: [
      { name: "Подольск", votes: 2 },
      { name: "Химки", votes: 1 },
      { name: "Балашиха", votes: 1 },
    ],
  },
  {
    region: "Кемеровская область",
    cities: [
      { name: "Кемерово", votes: 1 },
      { name: "Новокузнецк", votes: 2 },
    ],
  },
  {
    region: "Иркутская область",
    cities: [
      { name: "Иркутск", votes: 2 },
      { name: "Братск", votes: 1 },
    ],
  },
  {
    region: "Ставропольский край",
    cities: [
      { name: "Ставрополь", votes: 1 },
      { name: "Пятигорск", votes: 1 },
      { name: "Кисловодск", votes: 1 },
    ],
  },
  {
    region: "ХМАО",
    cities: [
      { name: "Сургут", votes: 2 },
      { name: "Нижневартовск", votes: 1 },
    ],
  },
  {
    region: "ЯНАО",
    cities: [
      { name: "Новый Уренгой", votes: 2 },
      { name: "Ноябрьск", votes: 1 },
    ],
  },
  {
    region: "Нижегородская область",
    cities: [{ name: "Нижний Новгород", votes: 2 }],
  },
  {
    region: "Новосибирская область",
    cities: [{ name: "Новосибирск", votes: 2 }],
  },
  { region: "Хабаровский край", cities: [{ name: "Хабаровск", votes: 1 }] },
  { region: "Пермский край", cities: [{ name: "Пермь", votes: 1 }] },
  { region: "Волгоградская область", cities: [{ name: "Волгоград", votes: 2 }] },
  { region: "Саратовская область", cities: [{ name: "Саратов", votes: 1 }] },
  { region: "Дагестан", cities: [{ name: "Махачкала", votes: 2 }] },
  { region: "Алтайский край", cities: [{ name: "Барнаул", votes: 1 }] },
  { region: "Красноярский край", cities: [{ name: "Красноярск", votes: 2 }] },
  { region: "Омская область", cities: [{ name: "Омск", votes: 1 }] },
  { region: "Воронежская область", cities: [{ name: "Воронеж", votes: 1 }] },
  { region: "Тюменская область", cities: [{ name: "Тюмень", votes: 2 }] },
  { region: "Якутия", cities: [{ name: "Якутск", votes: 1 }] },
  { region: "Калининградская область", cities: [{ name: "Калининград", votes: 1 }] },
  { region: "Мурманская область", cities: [{ name: "Мурманск", votes: 1 }] },
  { region: "Удмуртия", cities: [{ name: "Ижевск", votes: 1 }] },
  { region: "Тульская область", cities: [{ name: "Тула", votes: 1 }] },
  { region: "Ярославская область", cities: [{ name: "Ярославль", votes: 1 }] },
  { region: "Белгородская область", cities: [{ name: "Белгород", votes: 1 }] },
  { region: "Оренбургская область", cities: [{ name: "Оренбург", votes: 1 }] },
  { region: "Томская область", cities: [{ name: "Томск", votes: 1 }] },
  { region: "Бурятия", cities: [{ name: "Улан-Удэ", votes: 1 }] },
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
    const cities = group.cities.slice(0, MAX_CITIES_PER_REGION);
    for (const city of cities) {
      let hit = cache.get(city.name);
      if (hit === undefined) {
        hit = await searchCity(city.name);
        cache.set(city.name, hit);
      }
      if (!hit?.key) {
        missed.push(`${city.name} (${group.region})`);
        console.warn(`[geo-40] miss: ${city.name} [${group.region}]`);
        continue;
      }
      const votesCount = Math.max(1, Math.min(MAX_CITY_VOTES, Math.trunc(city.votes) || 1));
      console.info(
        `[geo-40] ok: ${city.name} ×${votesCount} → ${hit.label} (${hit.key}) [${group.region}]`,
      );
      for (let i = 0; i < votesCount; i++) {
        if (votes.length >= MAX_TOTAL_VOTES) break;
        votes.push({
          name: city.name,
          key: hit.key,
          label: hit.label,
          region: group.region,
        });
      }
      if (votes.length >= MAX_TOTAL_VOTES) break;
    }
    if (votes.length >= MAX_TOTAL_VOTES) break;
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
    console.error("[geo-40] QUIZ_SLUG is required (e.g. QUIZ_SLUG=demo)");
    process.exit(1);
  }

  const plannedRegions = REGION_GROUPS.length;
  console.info(
    `[geo-40] base=${base} slug=${slug} windowMs=${windowMs} plannedRegions=${plannedRegions} maxVotes=${MAX_TOTAL_VOTES}`,
  );
  if (plannedRegions !== EXPECTED_REGIONS) {
    console.warn(`[geo-40] expected ${EXPECTED_REGIONS} region groups, got ${plannedRegions}`);
  }

  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");

  const state = await fetchState(quizId);
  const active = state?.activeQuestion;
  const questionId = forcedQuestionId || active?.id;
  if (!questionId) throw new Error("no active question (set QUESTION_ID or enable geo-poll)");
  console.info(
    `[geo-40] quizId=${quizId} questionId=${questionId} text=${JSON.stringify(active?.text || "")}`,
  );

  const { votes, missed } = await resolvePlan();
  if (votes.length === 0) {
    console.error("[geo-40] no votes resolved");
    process.exit(1);
  }

  const uniqueCities = new Set(votes.map((v) => v.key)).size;
  const regions = new Set(votes.map((v) => v.region)).size;
  console.info(
    `[geo-40] regions=${regions} uniqueCities=${uniqueCities} votes=${votes.length} missed=${missed.length}; sending evenly over ${windowMs}ms`,
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
      const nickname = `g40_${index + 1}_${vote.name}`.slice(0, 32);
      const result = await submitOneVote({
        quizId,
        questionId,
        cityKey: vote.key,
        nickname,
      });
      const elapsed = Date.now() - startedAt;
      if (result.ok) {
        ok += 1;
        console.info(`[geo-40] +${elapsed}ms OK ${vote.name} [${vote.region}]`);
      } else {
        fail += 1;
        const reason = result.err || "unknown";
        failReasons.set(reason, (failReasons.get(reason) ?? 0) + 1);
        console.warn(`[geo-40] +${elapsed}ms FAIL ${vote.name}: ${reason}`);
      }
    }),
  );

  console.info(`[geo-40] done ok=${ok} fail=${fail} missedResolve=${missed.length}`);
  if (missed.length) console.info(`[geo-40] missed: ${missed.join(", ")}`);
  if (failReasons.size) {
    console.info(
      `[geo-40] fail reasons: ${[...failReasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[geo-40] fatal:", err);
  process.exit(1);
});
