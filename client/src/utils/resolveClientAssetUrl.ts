/**
 * Делает URL ассета доступным с устройства в той же LAN:
 * если в сохранённом URL хост localhost/127.0.0.1, подменяем на текущий контекст.
 *
 * В production за reverse proxy медиа на том же origin (`/media/...`), не на :4000.
 * В `vite dev` (порт 5173) оставляем API на :4000 с hostname страницы (телефон в Wi‑Fi).
 */
export function resolveClientAssetUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return "";
  if (typeof window === "undefined") return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const viteDev = window.location.protocol === "http:" && window.location.port === "5173";
      if (viteDev) {
        parsed.hostname = window.location.hostname || parsed.hostname;
        if (!parsed.port) parsed.port = "4000";
        return parsed.toString();
      }
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        window.location.origin,
      ).toString();
    }
    /** Загрузчик когда-то вернул тот же хост с :4000 — в проде медиа на 443 через Caddy. */
    if (
      parsed.port === "4000" &&
      parsed.hostname === window.location.hostname &&
      window.location.port !== "4000"
    ) {
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        window.location.origin,
      ).toString();
    }
    return parsed.toString();
  } catch {
    return value;
  }
}
