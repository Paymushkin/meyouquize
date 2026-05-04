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

/** После первого connect следующий connect считаем восстановлением после обрыва. */
let hadSuccessfulConnect = false;

socket.on("disconnect", (reason) => {
  console.info("[mq-socket] disconnected", { reason });
});

socket.on("connect", () => {
  if (hadSuccessfulConnect) {
    console.info("[mq-socket] reconnected", { socketId: socket.id });
  } else {
    console.info("[mq-socket] connected", { socketId: socket.id });
    hadSuccessfulConnect = true;
  }
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.info("[mq-socket] reconnect_attempt", { attempt });
});

socket.io.on("reconnect_error", (err) => {
  console.warn("[mq-socket] reconnect_error", err instanceof Error ? err.message : err);
});

socket.io.on("reconnect_failed", () => {
  console.error("[mq-socket] reconnect_failed (исчерпаны попытки)");
});

socket.on("connect_error", (err) => {
  console.warn("[mq-socket] connect_error", err instanceof Error ? err.message : err);
});
