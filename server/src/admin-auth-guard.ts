import { env } from "./env.js";

/**
 * Единый guard локального bypass админ-аутентификации.
 * Используется и в HTTP, и в Socket.IO обработчиках.
 */
export function isAdminAuthBypassed(): boolean {
  return env.localAdminNoAuth;
}
