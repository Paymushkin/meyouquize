import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

/** Частный IPv4 (10/8, 172.16–31/12, 192.168/16). */
export function isPrivateLanIPv4Address(address: string): boolean {
  const parts = address.split(".").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function ipv4Address(net: NetworkInterfaceInfo): string | undefined {
  if (net.family !== "IPv4") return undefined;
  return net.address;
}

/**
 * Текущий LAN IPv4 хоста (как `deploy/scripts/detect-lan-ip.sh`: en0 → en1 → … → любой private).
 */
export function detectLanIPv4(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string | undefined {
  const preferredIfaces = ["en0", "en1", "en2", "bridge0"];
  for (const iface of preferredIfaces) {
    const addr = pickPrivateIpv4(interfaces[iface]);
    if (addr) return addr;
  }
  for (const entries of Object.values(interfaces)) {
    const addr = pickPrivateIpv4(entries);
    if (addr) return addr;
  }
  return undefined;
}

function pickPrivateIpv4(entries: NetworkInterfaceInfo[] | undefined): string | undefined {
  if (!entries) return undefined;
  for (const net of entries) {
    if (net.internal) continue;
    const addr = ipv4Address(net);
    if (addr && isPrivateLanIPv4Address(addr)) return addr;
  }
  return undefined;
}

/** Origins для CORS / PDF при авто-LAN (ивент :80 и vite dev :5173). */
export function buildAutoLanClientOrigins(ip: string): string[] {
  return [`http://${ip}`, `http://${ip}:5173`, "http://localhost:5173"];
}
