/**
 * Делает URL ассета доступным с устройства в той же LAN:
 * если в сохранённом URL хост localhost/127.0.0.1, подменяем его на текущий hostname страницы.
 */
export function resolveClientAssetUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return "";
  if (typeof window === "undefined") return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = window.location.hostname || parsed.hostname;
      if (!parsed.port) parsed.port = "4000";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return value;
  }
}
