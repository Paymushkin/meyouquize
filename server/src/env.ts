import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const serverSrcDir = path.dirname(currentFile);
const projectRootEnv = path.resolve(serverSrcDir, "../../.env");

dotenv.config({ path: projectRootEnv });
dotenv.config();

/**
 * Малая инфраструктура: один процесс Node + Postgres. В `DATABASE_URL` для продакшена
 * задайте лимит пула, например `?connection_limit=5` (или через PgBouncer), чтобы не
 * исчерпать соединения на малом инстансе. `REDIS_URL` нужен только для нескольких
 * инстансов Socket.IO (см. attachSocketIoRedisAdapter).
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
  password: string,
): void {
  if (process.env.NODE_ENV !== "production") return;
  if (mode === "internet" && origins.length === 0) {
    throw new Error("CLIENT_ORIGIN must contain at least one origin in production internet mode");
  }
  if (password === "change-me") {
    throw new Error("ADMIN_PASSWORD must not be the default value in production");
  }
}

const networkMode = parseNetworkMode();
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const adminPassword = readAdminPassword();
validateProductionSecurity(networkMode, clientOrigins, adminPassword);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  networkMode,
  clientOrigins,
  allowLanViteOrigins: allowLanViteOrigins(),
  adminLogin: readAdminLogin(),
  adminPassword,
  databaseUrl:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/meyouquize",
  adminSessionHours: Number(process.env.ADMIN_SESSION_HOURS ?? 8),
  redisUrl: process.env.REDIS_URL?.trim() || undefined,
  /** Склейка всплесков пересчёта дашборда (мс). */
  dashboardResultsDebounceMs: Math.max(
    0,
    Number.parseInt(process.env.DASHBOARD_RESULTS_DEBOUNCE_MS ?? "220", 10) || 220,
  ),
  mediaDir: process.env.MEDIA_DIR?.trim() || path.resolve(serverSrcDir, "../../media"),
};
