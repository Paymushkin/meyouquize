/**
 * Разрешить Origin вида Vite-dev с хоста localhost / 127.0.0.1 / частной сети IPv4 на порту 5173.
 * Нужно, когда заходят с планшета по http://192.168.x.x:5173 при дефолтном CLIENT_ORIGIN только localhost.
 */
export function isPrivateNetworkViteDevPort(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    if (port !== "5173") return false;
    const h = url.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    const parts = h.split(".").map((x) => Number.parseInt(x, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
}
