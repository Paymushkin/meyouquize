import { socket } from "../../socket";
import { getOrCreateDeviceId } from "../../storage";

/** Антиспам для manual/restore-retry (не для первого restore после reload). */
export const QUIZ_JOIN_DEBOUNCE_MS = 400;

let joinDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastJoinEmitAt = 0;

export function resetQuizJoinDebounceForTests() {
  if (joinDebounceTimer) {
    clearTimeout(joinDebounceTimer);
    joinDebounceTimer = null;
  }
  lastJoinEmitAt = 0;
}

function emitJoinPayload(
  payload: {
    slug: string;
    nickname: string;
    deviceId: string;
  },
  reason: "manual" | "restore",
) {
  lastJoinEmitAt = Date.now();
  console.info("[quiz-play] join attempt", {
    reason,
    connected: socket.connected,
    socketId: socket.id,
    payload,
  });
  socket.emit("quiz:join", payload);
}

/** Дождаться connect без гонки: once после уже случившегося connect теряется. */
function whenSocketConnected(run: () => void) {
  if (socket.connected) {
    run();
    return;
  }
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    socket.off("connect", onConnect);
    socket.off("connect_error", onError);
    window.clearTimeout(timer);
  };
  const onConnect = () => {
    finish();
    console.info("[quiz-play] socket connected, retry join", { socketId: socket.id });
    run();
  };
  const onError = (err: Error) => {
    console.warn("[quiz-play] socket connect_error while joining", err.message);
  };
  const timer = window.setTimeout(() => {
    finish();
    if (socket.connected) run();
    else console.warn("[quiz-play] join wait: socket still not connected after 8s");
  }, 8_000);
  socket.on("connect", onConnect);
  socket.on("connect_error", onError);
  socket.connect();
  if (socket.connected) {
    finish();
    run();
  }
}

export function emitQuizJoin(slug: string, reason: "manual" | "restore", nick: string) {
  const payload = {
    slug,
    nickname: nick,
    deviceId: getOrCreateDeviceId(),
  };
  const emitNow = () => {
    whenSocketConnected(() => emitJoinPayload(payload, reason));
  };

  // Restore после reload — сразу, без паузы 2.5с (иначе лоадер «висит»).
  if (reason === "restore" || reason === "manual") {
    const elapsed = Date.now() - lastJoinEmitAt;
    const minGap = reason === "restore" ? QUIZ_JOIN_DEBOUNCE_MS : 0;
    if (reason === "manual" || elapsed >= minGap || lastJoinEmitAt === 0) {
      if (joinDebounceTimer) {
        clearTimeout(joinDebounceTimer);
        joinDebounceTimer = null;
      }
      emitNow();
      return;
    }
    if (joinDebounceTimer) clearTimeout(joinDebounceTimer);
    joinDebounceTimer = setTimeout(() => {
      joinDebounceTimer = null;
      emitNow();
    }, minGap - elapsed);
    return;
  }

  emitNow();
}
