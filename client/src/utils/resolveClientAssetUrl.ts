function resolveMediaAssetOrigin(): string {
  if (typeof window === "undefined") return "http://localhost:4000";
  const host = window.location.hostname || "localhost";
  const protocol = window.location.protocol || "http:";
  const viteDev = protocol === "http:" && window.location.port === "5173";
  return viteDev ? `${protocol}//${host}:4000` : window.location.origin;
}

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
    const viteDev = window.location.protocol === "http:" && window.location.port === "5173";

    // Любой /media/* — с backend (или текущего origin в prod), не со старых LAN-URL из реестра.
    if (parsed.pathname.startsWith("/media/")) {
      if (viteDev) {
        return `${resolveMediaAssetOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        window.location.origin,
      ).toString();
    }

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
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
      window.location.port !== "4000" &&
      !viteDev
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
