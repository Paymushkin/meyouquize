import { resolvePlayerFacingOrigin } from "./publicAppOrigin";

/** Origin для публичных ссылок и QR (см. `resolvePlayerFacingOrigin`). */
export const APP_ORIGIN = resolvePlayerFacingOrigin();

/**
 * Backend на том же origin, что и страница.
 * В `vite dev` `/api`, `/socket.io`, `/media` проксируются на :4000 (см. vite.config.ts) —
 * телефоны в LAN ходят только на :5173, без отдельного порта API.
 * Не используем `import.meta.env.DEV`: корневой `.env` с `NODE_ENV=production` (event:init)
 * сбрасывает DEV в false при `npm run dev`.
 */
const defaultApiBase = window.location.origin;

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? defaultApiBase;

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? API_BASE;
