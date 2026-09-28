/**
 * Локальный тест geo-poll: равномерно за ~60с отправить столицы субъектов РФ.
 *
 * Пример:
 *   QUIZ_SLUG=demo npm run loadtest:geo-capitals -w server
 *
 * Опции:
 *   BASE_URL=http://localhost:4000
 *   QUIZ_SLUG=demo
 *   DICTIONARY=world_cities
 *   WINDOW_MS=60000
 *   QUESTION_ID=...   # опционально, иначе берётся activeQuestion
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
 * Административные центры субъектов РФ (+ новые территории, если есть в словаре).
 * Для Магаса / Анадыря (нет в словаре pop≥15k) — ближайшие доступные города субъекта.
 */
const SUBJECT_CAPITALS = [
  // Республики
  "Майкоп",
  "Горно-Алтайск",
  "Уфа",
  "Улан-Удэ",
  "Махачкала",
  "Назрань", // Магас нет в словаре
  "Нальчик",
  "Элиста",
  "Черкесск",
  "Петрозаводск",
  "Сыктывкар",
  "Йошкар-Ола",
  "Саранск",
  "Якутск",
  "Владикавказ",
  "Казань",
  "Кызыл",
  "Ижевск",
  "Абакан",
  "Грозный",
  "Чебоксары",
  "Симферополь",
  // Края
  "Барнаул",
  "Чита",
  "Петропавловск-Камчатский",
  "Краснодар",
  "Красноярск",
  "Пермь",
  "Владивосток",
  "Ставрополь",
  "Хабаровск",
  // Области
  "Благовещенск",
  "Архангельск",
  "Астрахань",
  "Белгород",
  "Брянск",
  "Владимир",
  "Волгоград",
  "Вологда",
  "Воронеж",
  "Иваново",
  "Иркутск",
  "Калининград",
  "Калуга",
  "Кемерово",
  "Киров",
  "Кострома",
  "Курган",
  "Курск",
  "Гатчина", // Ленинградская обл.
  "Липецк",
  "Магадан",
  "Красногорск", // Московская обл.
  "Мурманск",
  "Нижний Новгород",
  "Великий Новгород",
  "Новосибирск",
  "Омск",
  "Оренбург",
  "Орёл",
  "Пенза",
  "Псков",
  "Ростов-на-Дону",
  "Рязань",
  "Самара",
  "Саратов",
  "Южно-Сахалинск",
  "Екатеринбург",
  "Смоленск",
  "Тамбов",
  "Тверь",
  "Томск",
  "Тула",
  "Тюмень",
  "Ульяновск",
  "Челябинск",
  "Ярославль",
  // Города фед. значения
  "Москва",
  "Санкт-Петербург",
  "Севастополь",
  // АО
  "Биробиджан",
  "Нарьян-Мар",
  "Ханты-Мансийск",
  "Анадырь",
  "Салехард",
  // Новые территории
  "Донецк",
  "Луганск",
  "Херсон",
  "Мелитополь",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function resolveCapitals() {
  /** @type {Array<{ name: string, key: string, label: string }>} */
  const resolved = [];
  /** @type {string[]} */
  const missed = [];
  const seenKeys = new Set();

  for (const name of SUBJECT_CAPITALS) {
    const hit = await searchCity(name);
    if (!hit?.key) {
      missed.push(name);
      console.warn(`[geo-capitals] miss: ${name}`);
      continue;
    }
    if (seenKeys.has(hit.key)) {
      console.warn(`[geo-capitals] duplicate key for ${name} → ${hit.label} (${hit.key}), skip`);
      continue;
    }
    seenKeys.add(hit.key);
    resolved.push({ name, key: hit.key, label: hit.label });
    console.info(`[geo-capitals] ok: ${name} → ${hit.label} (${hit.key})`);
  }
  return { resolved, missed };
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

/**
 * @param {{ quizId: string, questionId: string, cityKey: string, nickname: string }} args
 */
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
    console.error("[geo-capitals] QUIZ_SLUG is required (e.g. QUIZ_SLUG=demo)");
    process.exit(1);
  }

  console.info(`[geo-capitals] base=${base} slug=${slug} windowMs=${windowMs}`);
  const meta = await fetchMeta();
  const quizId = meta?.id;
  if (!quizId) throw new Error("quiz id missing from meta");

  const state = await fetchState(quizId);
  const active = state?.activeQuestion;
  const questionId = forcedQuestionId || active?.id;
  if (!questionId) throw new Error("no active question (set QUESTION_ID or enable geo-poll)");
  if (!forcedQuestionId && !active?.geoPollDictionary) {
    console.warn("[geo-capitals] active question has no geoPollDictionary — submitting anyway");
  }
  console.info(
    `[geo-capitals] quizId=${quizId} questionId=${questionId} text=${JSON.stringify(active?.text || "")}`,
  );

  const { resolved, missed } = await resolveCapitals();
  if (resolved.length === 0) {
    console.error("[geo-capitals] no cities resolved");
    process.exit(1);
  }
  console.info(
    `[geo-capitals] resolved=${resolved.length} missed=${missed.length}; sending evenly over ${windowMs}ms`,
  );

  const step = windowMs / resolved.length;
  let ok = 0;
  let fail = 0;
  const failReasons = new Map();

  const startedAt = Date.now();
  await Promise.all(
    resolved.map(async (city, index) => {
      const delay = Math.round(index * step);
      await sleep(delay);
      const nickname = `cap_${index + 1}_${city.name}`.slice(0, 32);
      const result = await submitOneVote({
        quizId,
        questionId,
        cityKey: city.key,
        nickname,
      });
      const elapsed = Date.now() - startedAt;
      if (result.ok) {
        ok += 1;
        console.info(`[geo-capitals] +${elapsed}ms OK ${city.name}`);
      } else {
        fail += 1;
        const reason = result.err || "unknown";
        failReasons.set(reason, (failReasons.get(reason) ?? 0) + 1);
        console.warn(`[geo-capitals] +${elapsed}ms FAIL ${city.name}: ${reason}`);
      }
    }),
  );

  console.info(`[geo-capitals] done ok=${ok} fail=${fail} missedResolve=${missed.length}`);
  if (missed.length) console.info(`[geo-capitals] missed: ${missed.join(", ")}`);
  if (failReasons.size) {
    console.info(
      `[geo-capitals] fail reasons: ${[...failReasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[geo-capitals] fatal:", err);
  process.exit(1);
});
