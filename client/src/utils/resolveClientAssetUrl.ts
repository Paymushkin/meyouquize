/**
 * Делает URL ассета доступным с устройства в той же LAN:
 * если в сохранённом URL хост localhost/127.0.0.1, подменяем на текущий контекст.
 *
 * И в `vite dev`, и в production медиа отдаём с того же origin (`/media/...`):
 * Vite проксирует на :4000, Caddy — на backend. Телефону не нужен порт 4000.
 */
export function resolveClientAssetUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return "";
  if (typeof window === "undefined") return value;
  try {
    const parsed = new URL(value, window.location.origin);

    // Любой /media/* — с текущего origin, не со старых LAN-URL / :4000 из реестра.
    if (parsed.pathname.startsWith("/media/")) {
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        window.location.origin,
      ).toString();
    }

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return new URL(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        window.location.origin,
      ).toString();
    }
    /** Загрузчик когда-то вернул тот же хост с :4000 — медиа на том же origin (proxy/Caddy). */
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
