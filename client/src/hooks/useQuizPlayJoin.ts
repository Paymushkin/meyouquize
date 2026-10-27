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

function persistedNickForSlug(slug: string): string {
  const roomNickname = localStorage.getItem(getRoomNickKey(slug)) || "";
  return (roomNickname || getNickname() || "").trim();
}

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
  const restoreRetryCountRef = useRef(0);

  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  const safeNick = () => (nickname || "").trim() || "Игрок";

  const requestJoin = (reason: "manual" | "restore", nicknameOverride?: string) => {
    if (!slug) return;
    const nick = (nicknameOverride ?? safeNick()).trim() || "Игрок";
    emitQuizJoin(slug, reason, nick);
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

  // Как можно раньше поднимаем сокет при restore — не ждём прочих эффектов.
  useEffect(() => {
    if (!slug || !shouldRestoreJoin(slug, getNickname())) return;
    if (socket.connected || socket.active) return;
    socket.connect();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const reconnectIfNeeded = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!joined && !joinPending) return;
      if (socket.connected || socket.active) return;
      socket.connect();
    };
    const onSocketConnect = () => {
      if (joinedRef.current) {
        requestJoin("restore");
        return;
      }
      if (joinPending && shouldRestoreJoin(slug, getNickname())) {
        const nick = persistedNickForSlug(slug);
        if (nick) emitQuizJoin(slug, "restore", nick);
      }
    };
    socket.on("connect", onSocketConnect);
    document.addEventListener("visibilitychange", reconnectIfNeeded);
    window.addEventListener("pageshow", reconnectIfNeeded);
    window.addEventListener("online", reconnectIfNeeded);
    return () => {
      socket.off("connect", onSocketConnect);
      document.removeEventListener("visibilitychange", reconnectIfNeeded);
      window.removeEventListener("pageshow", reconnectIfNeeded);
      window.removeEventListener("online", reconnectIfNeeded);
    };
  }, [joined, joinPending, nickname, slug]);

  useEffect(() => {
    if (!slug || restoreJoinAttemptedRef.current) return;
    if (!shouldRestoreJoin(slug, getNickname())) return;
    const persistedNick = persistedNickForSlug(slug);
    setJoinPending(true);
    setBootLoading(false);
    restoreJoinAttemptedRef.current = true;
    emitQuizJoin(slug, "restore", persistedNick);
  }, [setBootLoading, setJoinPending, slug]);

  // Быстрые повторы, если ack потерялся на transport error.
  useEffect(() => {
    if (!joinPending || joined || !slug) return;
    const tick = window.setInterval(() => {
      if (joinedRef.current) return;
      if (restoreRetryCountRef.current >= 6) return;
      if (!shouldRestoreJoin(slug, getNickname())) return;
      restoreRetryCountRef.current += 1;
      const nick = persistedNickForSlug(slug);
      if (nick) emitQuizJoin(slug, "restore", nick);
    }, 700);
    return () => window.clearInterval(tick);
  }, [joinPending, joined, slug]);

  useEffect(() => {
    if (!joinPending || joined) return;
    const timer = window.setTimeout(() => {
      setJoinPending(false);
      setBootLoading(false);
      onJoinTimeout?.();
    }, 12_000);
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
