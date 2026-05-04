const host = window.location.hostname || "localhost";
const protocol = window.location.protocol || "http:";

export const APP_ORIGIN =
  (import.meta.env.VITE_APP_ORIGIN as string | undefined) ?? window.location.origin;

/** В прод-сборке backend за тем же доменом (Caddy → /api, /socket.io). В `vite dev` — отдельный порт API. */
const defaultApiBase = import.meta.env.DEV ? `${protocol}//${host}:4000` : window.location.origin;

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? defaultApiBase;

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? API_BASE;
