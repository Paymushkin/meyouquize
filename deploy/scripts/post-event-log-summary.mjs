#!/usr/bin/env node
/**
 * Сводка логов meyouquize за окно ивента.
 * Читает stdin (journalctl, ssh, файл). Печатает отчёт в stdout.
 *
 * Ожидаемые маркеры:
 * - trial JSON: {"scope":"trial","event":"quiz_join_ok",...} (DEBUG_TRIAL_LOGS=1)
 * - [socket] disconnected { socketId, reason }
 * - [process] unhandledRejection
 * - [server] listening — старт воркера
 */
import readline from "node:readline";

const counts = new Map();
const answerErrors = new Map();
const disconnectReasons = new Map();
let trialJsonLines = 0;
let unhandledRejections = 0;
let serverListenEvents = 0;
let systemdStarts = 0;

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function tryParseTrial(line) {
  const start = line.indexOf('{"scope":"trial"');
  if (start < 0) {
    const alt = line.indexOf('{"scope": "trial"');
    if (alt < 0) return null;
    return JSON.parse(line.slice(alt));
  }
  const end = line.lastIndexOf("}");
  if (end < start) return null;
  return JSON.parse(line.slice(start, end + 1));
}

function processLine(line) {
  if (!line.trim()) return;

  if (line.includes("[process] unhandledRejection")) {
    unhandledRejections += 1;
  }
  if (line.includes("[server] listening")) {
    serverListenEvents += 1;
  }
  if (/Started Meyouquize backend service/i.test(line)) {
    systemdStarts += 1;
  }

  const discIdx = line.indexOf("[socket] disconnected");
  if (discIdx >= 0) {
    const reasonMatch = line.match(/reason:\s*([^,}\]]+)/);
    const reason = reasonMatch ? reasonMatch[1].trim() : "unknown";
    bump(disconnectReasons, reason);
    if (reason.includes("ping timeout") || line.includes("ping timeout")) {
      bump(counts, "ping_timeout_disconnect");
    }
  }

  if (line.includes("ping timeout") && !discIdx) {
    bump(counts, "ping_timeout_mention");
  }

  try {
    const trial = tryParseTrial(line);
    if (!trial || trial.scope !== "trial" || typeof trial.event !== "string") return;
    trialJsonLines += 1;
    bump(counts, trial.event);
    if (trial.event === "answer_submit_error" && typeof trial.error === "string") {
      bump(answerErrors, trial.error);
    }
  } catch {
    // не JSON — игнорируем
  }
}

function topEntries(map, limit = 12) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function printSection(title, rows) {
  console.log(`\n## ${title}`);
  if (rows.length === 0) {
    console.log("  (нет данных)");
    return;
  }
  for (const [key, value] of rows) {
    console.log(`  ${String(value).padStart(6)}  ${key}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  processLine(line);
}

const joinOk = counts.get("quiz_join_ok") ?? 0;
const joinErr = counts.get("quiz_join_error") ?? 0;
const submitOk = counts.get("answer_submit_ok") ?? 0;
const submitErr = counts.get("answer_submit_error") ?? 0;
const pingDisc = counts.get("ping_timeout_disconnect") ?? 0;

console.log("# Сводка логов meyouquize");
console.log(`Сгенерировано: ${new Date().toISOString()}`);
if (trialJsonLines === 0) {
  console.log(
    "\n⚠ Строк trial JSON не найдено. На проде включите DEBUG_TRIAL_LOGS=1 в deploy/env/.env.runtime.",
  );
} else {
  console.log(`\nСтрок trial JSON: ${trialJsonLines}`);
}

console.log("\n## Ключевые метрики");
console.log(`  quiz_join_ok:           ${joinOk}`);
console.log(`  quiz_join_error:        ${joinErr}`);
console.log(`  answer_submit_ok:       ${submitOk}`);
console.log(`  answer_submit_error:    ${submitErr}`);
if (submitOk + submitErr > 0) {
  const errPct = ((submitErr / (submitOk + submitErr)) * 100).toFixed(1);
  console.log(`  доля ошибок submit:     ${errPct}%`);
}
console.log(`  ping timeout (disc.):   ${pingDisc}`);
console.log(`  unhandledRejection:     ${unhandledRejections}`);
console.log(`  [server] listening:     ${serverListenEvents}`);
console.log(`  systemd Started:        ${systemdStarts}`);

printSection("Ошибки answer:submit (топ)", topEntries(answerErrors));
printSection("Причины [socket] disconnected (топ)", topEntries(disconnectReasons));
printSection(
  "Прочие trial-события",
  topEntries(counts).filter(([k]) => !answerErrors.has(k)),
);

if (joinOk > 0 && submitErr > 0) {
  console.log("\n## Подсказки");
  if ((answerErrors.get("Too many tags: max 1") ?? 0) > 5) {
    console.log("  • Много Too many tags — проверьте клиентскую валидацию облака тегов.");
  }
  if ((answerErrors.get("Question is not open") ?? 0) > 5) {
    console.log("  • Question is not open — timing/reconnect; смотрите ping timeout и join/час.");
  }
  if ((answerErrors.get("Not joined") ?? 0) > 0) {
    console.log("  • Not joined — гонка reconnect; проверьте quizSessionReady на клиенте.");
  }
}
