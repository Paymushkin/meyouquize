import { resolvePlayerFacingOrigin } from "./publicAppOrigin";

/** Origin для публичных ссылок и QR (см. `resolvePlayerFacingOrigin`). */
export const APP_ORIGIN = resolvePlayerFacingOrigin();

/**
 * Backend на том же origin, что и страница.
 * В `vite dev` `/api`, `/media` проксируются на :4000 (см. vite.config.ts) —
 * телефоны в LAN для REST/медиа ходят на :5173.
 * Не используем `import.meta.env.DEV`: корневой `.env` с `NODE_ENV=production` (event:init)
 * сбрасывает DEV в false при `npm run dev`.
 */
const defaultApiBase = window.location.origin;

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? defaultApiBase;

/**
 * Socket.IO в Vite (:5173/:5174) — same-origin (прокси `/socket.io` → :4000).
 * Прямой `:4000` с телефона в LAN часто даёт transport error / join timeout;
 * websocket через proxy в Safari тоже ломался — в `socket.ts` для LAN/Vite только polling.
 */
function defaultSocketUrl(): string {
  try {
    const { protocol, hostname, port } = window.location;
    if (port === "5173" || port === "5174") {
      return `${protocol}//${hostname}:${port}`;
    }
  } catch {
    /* SSR / тесты без window */
  }
  return defaultApiBase;
}

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? defaultSocketUrl();
