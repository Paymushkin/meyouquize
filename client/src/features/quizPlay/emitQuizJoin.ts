import { socket } from "../../socket";
import { getOrCreateDeviceId } from "../../storage";

export const QUIZ_JOIN_DEBOUNCE_MS = 2500;

let joinDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastJoinEmitAt = 0;

export function resetQuizJoinDebounceForTests() {
  if (joinDebounceTimer) {
    clearTimeout(joinDebounceTimer);
    joinDebounceTimer = null;
  }
  lastJoinEmitAt = 0;
}

export function emitQuizJoin(slug: string, reason: "manual" | "restore", nick: string) {
  const payload = {
    slug,
    nickname: nick,
    deviceId: getOrCreateDeviceId(),
  };
  const emitNow = () => {
    lastJoinEmitAt = Date.now();
    console.info("[quiz-play] join attempt", {
      reason,
      connected: socket.connected,
      socketId: socket.id,
      payload,
    });
    if (socket.connected) {
      socket.emit("quiz:join", payload);
      return;
    }
    socket.connect();
    socket.once("connect", () => {
      console.info("[quiz-play] socket connected, retry join", { socketId: socket.id, reason });
      socket.emit("quiz:join", payload);
    });
  };

  if (reason === "manual") {
    if (joinDebounceTimer) {
      clearTimeout(joinDebounceTimer);
      joinDebounceTimer = null;
    }
    emitNow();
    return;
  }

  const elapsed = Date.now() - lastJoinEmitAt;
  if (elapsed >= QUIZ_JOIN_DEBOUNCE_MS) {
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
  }, QUIZ_JOIN_DEBOUNCE_MS - elapsed);
}
