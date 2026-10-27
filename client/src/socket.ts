import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { armQuizJoinedRelay } from "./features/quizPlay/quizJoinedRelay";
import {
  clearEngineSessionId,
  shouldClearEngineSessionOnDisconnect,
  shouldPreferPollingOnly,
} from "./socketTransportPolicy";

/**
 * После `Set-Cookie` при логине браузер не обновляет заголовки уже установленного
 * Engine.IO/WebSocket — `socket.handshake.headers.cookie` на сервере остаётся старым,
 * `assertAdmin` не видит `mq_admin` → Forbidden на admin-событиях.
 */
export function disconnectSocketForCookieRefresh(): void {
  if (socket.connected) socket.disconnect();
}

const preferPollingOnly = shouldPreferPollingOnly({
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  pageHostname: typeof window !== "undefined" ? window.location.hostname || "" : "",
  pagePort: typeof window !== "undefined" ? window.location.port || "" : "",
  pageOrigin: typeof window !== "undefined" ? window.location.origin : "http://localhost",
  socketUrl: SOCKET_URL,
});

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  // При пике нагрузки на сервере дефолтный handshake 20s даёт connect_error "timeout" в админке.
  timeout: 45_000,
  // websocket первым: без polling→ws upgrade (на рефреше probe часто рвётся →
  // «WS closed before established» + POST …&sid=… 400 Session ID unknown).
  // Safari/LAN Vite — только polling (см. socketTransportPolicy).
  ...(preferPollingOnly
    ? {
        transports: ["polling"] as const,
        upgrade: false,
      }
    : {
        transports: ["websocket", "polling"] as const,
        upgrade: false,
      }),
  rememberUpgrade: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 15_000,
});

/** После первого connect следующий connect считаем восстановлением после обрыва. */
let hadSuccessfulConnect = false;

socket.on("disconnect", (reason) => {
  console.info("[mq-socket] disconnected", { reason });
  if (shouldClearEngineSessionOnDisconnect(reason)) {
    clearEngineSessionId(socket.io?.engine);
  }
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
  // Не тащить мёртвый Engine.IO sid в новый open после 400 / transport error.
  clearEngineSessionId(socket.io?.engine);
  console.info("[mq-socket] reconnect_attempt", { attempt });
});

socket.io.on("reconnect_error", (err) => {
  console.warn("[mq-socket] reconnect_error", err instanceof Error ? err.message : err);
});

socket.io.on("reconnect_failed", () => {
  console.error("[mq-socket] reconnect_failed (исчерпаны попытки)");
});

socket.on("connect_error", (err) => {
  clearEngineSessionId(socket.io?.engine);
  console.warn("[mq-socket] connect_error", err instanceof Error ? err.message : err);
});

armQuizJoinedRelay(socket);
