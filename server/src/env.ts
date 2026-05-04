import dotenv from "dotenv";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dedupeAdminAccountsByLogin,
  parseAdminAccountsJsonArray,
  tryDecodeAdminAccountsBase64,
  type AdminAccount,
} from "./admin-accounts.js";

const currentFile = fileURLToPath(import.meta.url);
const serverSrcDir = path.dirname(currentFile);
const projectRootEnv = path.resolve(serverSrcDir, "../../.env");

dotenv.config({ path: projectRootEnv });
dotenv.config();

/**
 * Малая инфраструктура: Node + Postgres. В `DATABASE_URL` задайте лимит пула, например
 * `?connection_limit=5` (или PgBouncer). Несколько воркеров: `CLUSTER_WORKERS` в
 * `server/src/index.ts` + обязательный `REDIS_URL` для Socket.IO (см. attachSocketIoRedisAdapter).
 *
 * Дашборд результатов: `DASHBOARD_RESULTS_DEBOUNCE_MS` — пауза перед пересчётом после
 * всплеска `answer:submit` (меньше — живее UI, больше — меньше нагрузки на Postgres).
 */
/**
 * Разрешить CORS для http(s)://*:5173 с частных IP / localhost, если не production
 * и не задано CLIENT_ORIGIN_ALLOW_LAN=0. Явно включить: CLIENT_ORIGIN_ALLOW_LAN=1.
 */
function allowLanViteOrigins(): boolean {
  if (process.env.APP_NETWORK_MODE === "internet") return false;
  if (process.env.CLIENT_ORIGIN_ALLOW_LAN === "0") return false;
  if (process.env.CLIENT_ORIGIN_ALLOW_LAN === "1") return true;
  // По умолчанию включено для локальных мероприятий в одной Wi-Fi сети.
  return true;
}

type AppNetworkMode = "internet" | "lan";

function parseNetworkMode(): AppNetworkMode {
  const raw = (process.env.APP_NETWORK_MODE ?? "").trim().toLowerCase();
  if (raw === "internet" || raw === "lan") return raw;
  return process.env.NODE_ENV === "production" ? "internet" : "lan";
}

function readAdminLogin(): string {
  const login = process.env.ADMIN_LOGIN?.trim();
  if (login) return login;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_LOGIN is required in production");
  }
  return "admin";
}

function readAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password) return password;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD is required in production");
  }
  return "change-me";
}

function validateProductionSecurity(
  mode: AppNetworkMode,
  origins: string[],
  accounts: AdminAccount[],
): void {
  if (process.env.NODE_ENV !== "production") return;
  if (mode === "internet" && origins.length === 0) {
    throw new Error("CLIENT_ORIGIN must contain at least one origin in production internet mode");
  }
  if (accounts.length === 0) {
    throw new Error("At least one admin account is required in production");
  }
  for (const acc of accounts) {
    if (acc.password === "change-me") {
      throw new Error(
        `ADMIN password for "${acc.login}" must not be the default value in production`,
      );
    }
  }
}

function explicitAdminAccountsJsonRaw(): string {
  if (process.env.ADMIN_ACCOUNTS_BASE64?.trim() && process.env.ADMIN_ACCOUNTS?.trim()) {
    console.warn("[env] Both ADMIN_ACCOUNTS_BASE64 and ADMIN_ACCOUNTS set; using BASE64 only.");
  }
  const decoded =
    tryDecodeAdminAccountsBase64(process.env.ADMIN_ACCOUNTS_BASE64) ??
    process.env.ADMIN_ACCOUNTS?.trim() ??
    "";
  return decoded.trim();
}

/**
 * Все админы — один JSON-массив в `ADMIN_ACCOUNTS` или в `ADMIN_ACCOUNTS_BASE64` (рекомендуется в production).
 * Если переменные не заданы — fallback на `ADMIN_LOGIN` + `ADMIN_PASSWORD` (один админ), для локальной разработки.
 */
function resolveAdminAccounts(): AdminAccount[] {
  const raw = explicitAdminAccountsJsonRaw();
  if (raw) {
    const list = dedupeAdminAccountsByLogin(parseAdminAccountsJsonArray(raw));
    if (list.length === 0) {
      const msg =
        'ADMIN_ACCOUNTS / ADMIN_ACCOUNTS_BASE64 must be a valid JSON array with at least one {"login":"...","password":"..."} object.';
      if (process.env.NODE_ENV === "production") {
        throw new Error(msg);
      }
      console.warn(`[env] ${msg} Falling back to ADMIN_LOGIN / ADMIN_PASSWORD.`);
      return [{ login: readAdminLogin(), password: readAdminPassword() }];
    }
    return list;
  }
  return [{ login: readAdminLogin(), password: readAdminPassword() }];
}

const networkMode = parseNetworkMode();
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const adminAccounts = resolveAdminAccounts();
validateProductionSecurity(networkMode, clientOrigins, adminAccounts);

console.info(
  `[env] Admin accounts: ${adminAccounts.length} (logins: ${adminAccounts.map((a) => a.login).join(", ")})`,
);

/** Несколько воркеров на одном порту (node:cluster). >1 требует REDIS_URL для Socket.IO. */
function resolveClusterWorkers(): number {
  const raw = (process.env.CLUSTER_WORKERS ?? "").trim().toLowerCase();
  if (raw === "" || raw === "1") return 1;
  if (raw === "0" || raw === "auto") {
    const n = availableParallelism();
    return Math.min(Math.max(n, 1), 8);
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 16);
}

const clusterWorkers = resolveClusterWorkers();
const socketIoRequiresRedis = clusterWorkers > 1;
console.info(`[env] CLUSTER_WORKERS=${clusterWorkers} (set CLUSTER_WORKERS=1 to disable cluster)`);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  networkMode,
  clientOrigins,
  allowLanViteOrigins: allowLanViteOrigins(),
  /** Все пары логин/пароль из одного JSON-массива (или legacy ADMIN_LOGIN / ADMIN_PASSWORD). */
  adminAccounts,
  databaseUrl:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/meyouquize",
  adminSessionHours: Number(process.env.ADMIN_SESSION_HOURS ?? 8),
  redisUrl: process.env.REDIS_URL?.trim() || undefined,
  /** Склейка всплесков пересчёта дашборда (мс). */
  dashboardResultsDebounceMs: Math.max(
    0,
    Number.parseInt(process.env.DASHBOARD_RESULTS_DEBOUNCE_MS ?? "220", 10) || 220,
  ),
  /**
   * После join/disconnect пересчёт онлайна через fetchSockets по комнате — дорогой при сотнях сокетов.
   * Дебаунс склеивает всплески (один проход вместо сотен подряд). 0 = без дебаунса (только для отладки).
   */
  quizOnlineCountDebounceMs: Math.max(
    0,
    Number.parseInt(process.env.QUIZ_ONLINE_COUNT_DEBOUNCE_MS ?? "250", 10) || 250,
  ),
  mediaDir: process.env.MEDIA_DIR?.trim() || path.resolve(serverSrcDir, "../../media"),
  /** Количество Node-воркеров (см. `server/src/index.ts`). */
  clusterWorkers,
  /** При true Redis-адаптер Socket.IO обязателен и при ошибке подключения процесс падает. */
  socketIoRequiresRedis,
};
