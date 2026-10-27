/** Частные IPv4 (LAN). */
export function isPrivateLanHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

export function isSafariOrAppleMobileUa(ua: string): boolean {
  const isAppleMobile = /iP(hone|ad|od)/.test(ua);
  const isSafariDesktop = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/i.test(ua);
  return isAppleMobile || isSafariDesktop;
}

export type SocketTransportContext = {
  userAgent: string;
  pageHostname: string;
  pagePort: string;
  pageOrigin: string;
  socketUrl: string;
};

/**
 * Safari/iOS в LAN/Vite: только polling.
 * Chrome и др.: polling + websocket upgrade.
 */
export function shouldPreferPollingOnly(ctx: SocketTransportContext): boolean {
  try {
    if (!isSafariOrAppleMobileUa(ctx.userAgent)) return false;

    if (isPrivateLanHostname(ctx.pageHostname)) return true;
    const socketHost = new URL(ctx.socketUrl, ctx.pageOrigin).hostname;
    if (isPrivateLanHostname(socketHost)) return true;
    if (ctx.pagePort !== "5173" && ctx.pagePort !== "5174") return false;
    return new URL(ctx.socketUrl, ctx.pageOrigin).origin === ctx.pageOrigin;
  } catch {
    return false;
  }
}

/** Причины disconnect, после которых Engine.IO sid нельзя переиспользовать. */
export function shouldClearEngineSessionOnDisconnect(reason: string): boolean {
  return (
    reason === "transport close" ||
    reason === "transport error" ||
    reason === "ping timeout" ||
    reason === "io server disconnect"
  );
}

export type EngineSessionLike = {
  id?: string | null;
  transport?: { query?: { sid?: string } };
};

/** Сброс sid после обрыва — следующий open без POST «Session ID unknown». */
export function clearEngineSessionId(engine: EngineSessionLike | null | undefined): void {
  if (!engine) return;
  engine.id = null;
  if (engine.transport?.query) delete engine.transport.query.sid;
}
