import { useEffect, useRef } from "react";
import { socket } from "../socket";
import { getNickname } from "../storage";
import { emitQuizJoin } from "../features/quizPlay/emitQuizJoin";
import {
  clearRoomJoined,
  getRoomNickKey,
  markRoomJoined,
  shouldRestoreJoin,
} from "../features/quizPlay/joinStorage";

type Params = {
  slug: string;
  nickname: string;
  joined: boolean;
  joinPending: boolean;
  setJoinPending: (value: boolean) => void;
  setBootLoading: (value: boolean) => void;
  onJoinTimeout?: () => void;
};

export function useQuizPlayJoin({
  slug,
  nickname,
  joined,
  joinPending,
  setJoinPending,
  setBootLoading,
  onJoinTimeout,
}: Params) {
  const joinedRef = useRef(false);
  const restoreJoinAttemptedRef = useRef(false);

  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  const safeNick = () => (nickname || "").trim() || "Игрок";

  const requestJoin = (reason: "manual" | "restore") => {
    if (!slug) return;
    emitQuizJoin(slug, reason, safeNick());
  };

  const requestRestoreJoin = () => {
    setJoinPending(true);
    requestJoin("restore");
  };

  const markJoinPersisted = () => {
    if (slug) markRoomJoined(slug);
  };

  const clearJoinPersisted = () => {
    if (!slug) return;
    try {
      clearRoomJoined(slug);
    } catch {
      // ignore storage errors in private mode
    }
  };

  useEffect(() => {
    if (!slug) return;
    const reconnectAndRejoinIfNeeded = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!socket.connected) socket.connect();
      if (joined) requestJoin("restore");
    };
    const onSocketConnect = () => {
      if (!joined) return;
      requestJoin("restore");
    };
    socket.on("connect", onSocketConnect);
    document.addEventListener("visibilitychange", reconnectAndRejoinIfNeeded);
    window.addEventListener("pageshow", reconnectAndRejoinIfNeeded);
    window.addEventListener("online", reconnectAndRejoinIfNeeded);
    return () => {
      socket.off("connect", onSocketConnect);
      document.removeEventListener("visibilitychange", reconnectAndRejoinIfNeeded);
      window.removeEventListener("pageshow", reconnectAndRejoinIfNeeded);
      window.removeEventListener("online", reconnectAndRejoinIfNeeded);
    };
  }, [joined, nickname, slug]);

  useEffect(() => {
    if (!slug || restoreJoinAttemptedRef.current) return;
    if (!shouldRestoreJoin(slug, getNickname())) return;
    restoreJoinAttemptedRef.current = true;
    const roomNickname = localStorage.getItem(getRoomNickKey(slug)) || "";
    const persistedNick = roomNickname || getNickname() || "";
    setJoinPending(true);
    setBootLoading(true);
    emitQuizJoin(slug, "restore", persistedNick.trim());
  }, [setBootLoading, setJoinPending, slug]);

  useEffect(() => {
    if (!joinPending || joined) return;
    const timer = window.setTimeout(() => {
      setJoinPending(false);
      setBootLoading(false);
      onJoinTimeout?.();
    }, 50_000);
    return () => window.clearTimeout(timer);
  }, [joinPending, joined, onJoinTimeout, setBootLoading, setJoinPending]);

  return {
    joinedRef,
    requestJoin,
    requestRestoreJoin,
    markJoinPersisted,
    clearJoinPersisted,
  };
}
