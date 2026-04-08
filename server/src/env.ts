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
  if (process.env.CLIENT_ORIGIN_ALLOW_LAN === "0") return false;
  if (process.env.CLIENT_ORIGIN_ALLOW_LAN === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowLanViteOrigins: allowLanViteOrigins(),
  adminLogin: process.env.ADMIN_LOGIN ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "change-me",
  databaseUrl:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/meyouquize",
  adminSessionHours: Number(process.env.ADMIN_SESSION_HOURS ?? 8),
  redisUrl: process.env.REDIS_URL?.trim() || undefined,
  /** Склейка всплесков пересчёта дашборда (мс). */
  dashboardResultsDebounceMs: Math.max(
    0,
    Number.parseInt(process.env.DASHBOARD_RESULTS_DEBOUNCE_MS ?? "220", 10) || 220,
  ),
};
