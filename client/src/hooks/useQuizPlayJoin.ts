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

  useEffect(() => {
    if (!slug) return;
    // После клика по баннеру (target=_blank) вкладка теряет/возвращает focus —
    // не шлём quiz:join, если сокет уже жив. Иначе упираемся в rate-limit.
    const reconnectIfNeeded = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!joined) return;
      if (!socket.connected) socket.connect();
    };
    const onSocketConnect = () => {
      if (!joined) return;
      requestJoin("restore");
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
  }, [joined, nickname, slug]);

  useEffect(() => {
    if (!slug || restoreJoinAttemptedRef.current) return;
    if (!shouldRestoreJoin(slug, getNickname())) return;
    const roomNickname = localStorage.getItem(getRoomNickKey(slug)) || "";
    const persistedNick = roomNickname || getNickname() || "";
    setJoinPending(true);
    setBootLoading(true);
    /** После всех useEffect на странице — иначе quiz:joined приходит до socket.on в useQuizPlaySocket. */
    const timer = window.setTimeout(() => {
      restoreJoinAttemptedRef.current = true;
      emitQuizJoin(slug, "restore", persistedNick.trim());
    }, 0);
    return () => window.clearTimeout(timer);
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
