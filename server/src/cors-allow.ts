/**
 * Разрешить Origin c localhost / 127.0.0.1 / частной сети IPv4 (LAN).
 * На мобильных браузерах Origin может отличаться по порту, поэтому не ограничиваемся 5173.
 */
export function isPrivateNetworkViteDevPort(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const h = url.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    const parts = h.split(".").map((x) => Number.parseInt(x, 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255))
      return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
}
