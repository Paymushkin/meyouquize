import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";

/**
 * После `Set-Cookie` при логине браузер не обновляет заголовки уже установленного
 * Engine.IO/WebSocket — `socket.handshake.headers.cookie` на сервере остаётся старым,
 * `assertAdmin` не видит `mq_admin` → Forbidden на admin-событиях.
 */
export function disconnectSocketForCookieRefresh(): void {
  if (socket.connected) socket.disconnect();
}

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket", "polling"],
  upgrade: true,
  rememberUpgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2500,
});
