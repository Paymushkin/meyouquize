import { resolvePlayerFacingOrigin } from "./publicAppOrigin";

const host = window.location.hostname || "localhost";
const protocol = window.location.protocol || "http:";

/** Origin для публичных ссылок и QR (см. `resolvePlayerFacingOrigin`). */
export const APP_ORIGIN = resolvePlayerFacingOrigin();

/**
 * В prod backend за тем же доменом (Caddy → /api, /socket.io).
 * В `vite dev` — отдельный порт API. Не используем `import.meta.env.DEV`: корневой `.env`
 * с `NODE_ENV=production` (event:init) сбрасывает DEV в false при `npm run dev`.
 */
const isViteDevServer = import.meta.env.MODE === "development";
const defaultApiBase = isViteDevServer ? `${protocol}//${host}:4000` : window.location.origin;

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? defaultApiBase;

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? API_BASE;
