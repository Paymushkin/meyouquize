import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../../socket";

import type { NetworkingProfileTextFields } from "@meyouquize/shared";

export type NetworkingProfile = NetworkingProfileTextFields & {
  avatarUrl: string;
  visibleInDirectory: boolean;
};

export type NetworkingGuest = {
  participantId: string;
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
  online: boolean;
  hasProfile: boolean;
};

export type NetworkingThread = {
  threadId: string;
  peer: {
    participantId: string;
    nickname: string;
    fullName: string;
    avatarUrl: string;
  };
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
  unread: number;
  updatedAt: string;
};

export type NetworkingMessage = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
};

const PRESENCE_INTERVAL_MS = 12_000;
export const NETWORKING_GUESTS_PAGE_SIZE = 25;
export const NETWORKING_THREADS_PAGE_SIZE = 15;

function profileHasContent(profile: NetworkingProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.fullName.trim() ||
    profile.jobTitle.trim() ||
    profile.company.trim() ||
    profile.offers.trim() ||
    profile.seeking.trim(),
  );
}

function applySelfProfileToGuests(
  list: NetworkingGuest[],
  selfId: string,
  nextProfile: NetworkingProfile,
): NetworkingGuest[] {
  const patched = list.map((g) =>
    g.participantId === selfId
      ? {
          ...g,
          fullName: nextProfile.fullName,
          jobTitle: nextProfile.jobTitle,
          company: nextProfile.company,
          avatarUrl: nextProfile.avatarUrl,
          offers: nextProfile.offers,
          seeking: nextProfile.seeking,
          hasProfile: true,
        }
      : g,
  );
  const selfIdx = patched.findIndex((g) => g.participantId === selfId);
  if (selfIdx <= 0) return patched;
  const next = [...patched];
  const [self] = next.splice(selfIdx, 1);
  next.unshift(self!);
  return next;
}

export function usePlayerNetworking(options: {
  quizId: string | undefined;
  enabled: boolean;
  joined: boolean;
}) {
  const { quizId, enabled, joined } = options;
  const [selfParticipantId, setSelfParticipantId] = useState<string | null>(null);
  const [profile, setProfile] = useState<NetworkingProfile | null>(null);
  const [guests, setGuests] = useState<NetworkingGuest[]>([]);
  const [guestsTotal, setGuestsTotal] = useState(0);
  const [guestsQuery, setGuestsQuery] = useState("");
  const [guestsPage, setGuestsPage] = useState(0);
  const [threads, setThreads] = useState<NetworkingThread[]>([]);
  const [threadsTotal, setThreadsTotal] = useState(0);
  const [threadsHasMore, setThreadsHasMore] = useState(false);
  const [threadsLoadingMore, setThreadsLoadingMore] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [activePeerLabel, setActivePeerLabel] = useState("");
  const [activePeerAvatarUrl, setActivePeerAvatarUrl] = useState("");
  /** Куда вернуться по «Назад» из диалога: guests | chats. */
  const [chatReturnTab, setChatReturnTab] = useState<"guests" | "chats" | null>(null);
  const [messages, setMessages] = useState<NetworkingMessage[]>([]);
  const activeThreadIdRef = useRef<string | null>(null);
  const activePeerIdRef = useRef<string | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const profileRef = useRef<NetworkingProfile | null>(null);
  const threadsLenRef = useRef(0);
  const threadsHasMoreRef = useRef(false);
  const threadsLoadingMoreRef = useRef(false);
  activeThreadIdRef.current = activeThreadId;
  activePeerIdRef.current = activePeerId;
  selfIdRef.current = selfParticipantId;
  // Не затирать profileRef «старым» null между saveProfile и следующим commit state.
  if (profile) profileRef.current = profile;
  threadsLenRef.current = threads.length;
  threadsHasMoreRef.current = threadsHasMore;
  threadsLoadingMoreRef.current = threadsLoadingMore;

  useEffect(() => {
    if (!enabled || !joined || !quizId) return;

    socket.emit("networking:join", { quizId });
    socket.emit("networking:profile:get", { quizId });
    socket.emit("networking:threads:list", {
      quizId,
      limit: NETWORKING_THREADS_PAGE_SIZE,
      offset: 0,
    });
    socket.emit("networking:guests:list", {
      quizId,
      limit: NETWORKING_GUESTS_PAGE_SIZE,
      offset: 0,
    });
    setGuestsPage(0);
    setThreadsLoadingMore(false);

    const onJoined = (payload: { quizId?: string; participantId?: string }) => {
      if (payload.quizId !== quizId) return;
      if (typeof payload.participantId === "string") setSelfParticipantId(payload.participantId);
    };
    const onProfile = (payload: { participantId?: string; profile?: NetworkingProfile | null }) => {
      const selfId = selfIdRef.current;
      if (selfId && payload.participantId && payload.participantId !== selfId) return;
      const nextProfile = payload.profile ?? null;
      // profile:get часто приходит пустым уже после локального save с формы входа.
      if (!profileHasContent(nextProfile) && profileHasContent(profileRef.current)) {
        return;
      }
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      if (selfId && nextProfile) {
        setGuests((prev) => applySelfProfileToGuests(prev, selfId, nextProfile));
      }
    };
    const onGuests = (payload: { quizId?: string; total?: number; guests?: NetworkingGuest[] }) => {
      if (payload.quizId !== quizId) return;
      let next = Array.isArray(payload.guests) ? payload.guests : [];
      const selfId = selfIdRef.current;
      const selfProfile = profileRef.current;
      if (selfId && selfProfile) {
        next = applySelfProfileToGuests(next, selfId, selfProfile);
      } else if (selfId) {
        const selfIdx = next.findIndex((g) => g.participantId === selfId);
        if (selfIdx > 0) {
          next = [...next];
          const [self] = next.splice(selfIdx, 1);
          next.unshift(self!);
        }
      }
      setGuests(next);
      setGuestsTotal(typeof payload.total === "number" ? payload.total : next.length);
    };
    const onThreads = (payload: {
      quizId?: string;
      threads?: NetworkingThread[];
      total?: number;
      offset?: number;
      hasMore?: boolean;
      unreadTotal?: number;
    }) => {
      if (payload.quizId !== quizId) return;
      const activeId = activeThreadIdRef.current;
      const next = (Array.isArray(payload.threads) ? payload.threads : []).map((t) =>
        activeId && t.threadId === activeId ? { ...t, unread: 0 } : t,
      );
      const offset = typeof payload.offset === "number" ? payload.offset : 0;
      if (offset > 0) {
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t.threadId));
          return [...prev, ...next.filter((t) => !seen.has(t.threadId))];
        });
      } else {
        setThreads(next);
      }
      if (typeof payload.total === "number") setThreadsTotal(payload.total);
      setThreadsHasMore(Boolean(payload.hasMore));
      if (typeof payload.unreadTotal === "number") setUnreadTotal(payload.unreadTotal);
      setThreadsLoadingMore(false);
    };
    const onHistory = (payload: { threadId?: string; messages?: NetworkingMessage[] }) => {
      if (!payload.threadId || payload.threadId !== activeThreadIdRef.current) return;
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    };
    const onMessage = (dto: NetworkingMessage) => {
      const activeId = activeThreadIdRef.current;
      const peerId = activePeerIdRef.current;
      const selfId = selfIdRef.current;
      if (activeId && dto.threadId === activeId) {
        setMessages((prev) => (prev.some((m) => m.id === dto.id) ? prev : [...prev, dto]));
        // Чат открыт — сразу помечаем прочитанным, чтобы бейдж не вспыхивал.
        if (dto.senderId !== selfId) {
          socket.emit("networking:dm:read", { quizId, threadId: activeId });
        }
      } else if (!activeId && peerId && (dto.senderId === peerId || dto.senderId === selfId)) {
        setActiveThreadId(dto.threadId);
        setMessages((prev) => (prev.some((m) => m.id === dto.id) ? prev : [...prev, dto]));
        if (dto.senderId !== selfId) {
          socket.emit("networking:dm:read", { quizId, threadId: dto.threadId });
        }
      }
      socket.emit("networking:threads:list", {
        quizId,
        limit: Math.max(NETWORKING_THREADS_PAGE_SIZE, threadsLenRef.current),
        offset: 0,
      });
    };

    socket.on("networking:joined", onJoined);
    socket.on("networking:profile", onProfile);
    socket.on("networking:guests", onGuests);
    socket.on("networking:threads", onThreads);
    socket.on("networking:dm:history", onHistory);
    socket.on("networking:dm:message", onMessage);

    const presenceTimer = window.setInterval(() => {
      socket.emit("networking:presence:touch", { quizId });
    }, PRESENCE_INTERVAL_MS);

    return () => {
      window.clearInterval(presenceTimer);
      socket.off("networking:joined", onJoined);
      socket.off("networking:profile", onProfile);
      socket.off("networking:guests", onGuests);
      socket.off("networking:threads", onThreads);
      socket.off("networking:dm:history", onHistory);
      socket.off("networking:dm:message", onMessage);
    };
  }, [enabled, joined, quizId]);

  const guestsPageCount = Math.max(1, Math.ceil(guestsTotal / NETWORKING_GUESTS_PAGE_SIZE));

  const refreshGuests = useCallback(
    (query?: string, page = 0) => {
      if (!quizId || !enabled) return;
      const safePage = Math.max(0, page);
      setGuestsPage(safePage);
      if (typeof query === "string") setGuestsQuery(query);
      socket.emit("networking:guests:list", {
        quizId,
        query: query ?? guestsQuery,
        limit: NETWORKING_GUESTS_PAGE_SIZE,
        offset: safePage * NETWORKING_GUESTS_PAGE_SIZE,
      });
    },
    [enabled, guestsQuery, quizId],
  );

  const refreshProfile = useCallback(() => {
    if (!quizId || !enabled) return;
    socket.emit("networking:profile:get", { quizId });
  }, [enabled, quizId]);

  const goToGuestsPage = useCallback(
    (page: number) => {
      refreshGuests(guestsQuery, page);
    },
    [guestsQuery, refreshGuests],
  );

  const saveProfile = useCallback(
    (patch: Partial<NetworkingProfile>) => {
      if (!quizId || !enabled) return;
      const selfId = selfIdRef.current;
      const nextProfile: NetworkingProfile = {
        fullName: patch.fullName ?? profileRef.current?.fullName ?? "",
        jobTitle: patch.jobTitle ?? profileRef.current?.jobTitle ?? "",
        company: patch.company ?? profileRef.current?.company ?? "",
        avatarUrl: patch.avatarUrl ?? profileRef.current?.avatarUrl ?? "",
        offers: patch.offers ?? profileRef.current?.offers ?? "",
        seeking: patch.seeking ?? profileRef.current?.seeking ?? "",
        visibleInDirectory:
          patch.visibleInDirectory ?? profileRef.current?.visibleInDirectory ?? true,
      };
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      if (selfId) {
        setGuests((prev) => {
          const patched = applySelfProfileToGuests(prev, selfId, nextProfile);
          if (patched.some((g) => g.participantId === selfId) || guestsPage !== 0) {
            return patched;
          }
          return [
            {
              participantId: selfId,
              nickname: "",
              fullName: nextProfile.fullName,
              jobTitle: nextProfile.jobTitle,
              company: nextProfile.company,
              avatarUrl: nextProfile.avatarUrl,
              offers: nextProfile.offers,
              seeking: nextProfile.seeking,
              online: true,
              hasProfile: true,
            },
            ...patched,
          ];
        });
      }
      // Не дергаем guests:list сразу — ответ может прийти раньше commit profile:set
      // и затереть «Ищу»/«Полезен» пустыми значениями (ФИО при этом видно из ника).
      socket.emit("networking:profile:set", { quizId, ...patch });
    },
    [enabled, guestsPage, quizId],
  );

  const openChatWithPeer = useCallback(
    (
      peerId: string,
      threadId?: string,
      peerMeta?: { label?: string; avatarUrl?: string; returnTab?: "guests" | "chats" },
    ) => {
      if (!quizId || !enabled) return;
      setChatReturnTab(peerMeta?.returnTab ?? (threadId ? "chats" : "guests"));
      setActivePeerId(peerId);
      const fromThread = threads.find((t) => t.peer.participantId === peerId);
      const fromGuest = guests.find((g) => g.participantId === peerId);
      const label =
        peerMeta?.label?.trim() ||
        fromThread?.peer.fullName?.trim() ||
        fromThread?.peer.nickname ||
        fromGuest?.fullName?.trim() ||
        fromGuest?.nickname ||
        "";
      const avatarUrl =
        peerMeta?.avatarUrl?.trim() || fromThread?.peer.avatarUrl || fromGuest?.avatarUrl || "";
      setActivePeerLabel(label);
      setActivePeerAvatarUrl(avatarUrl);
      const markThreadSeen = (id: string) => {
        setThreads((prev) => {
          let cleared = 0;
          const next = prev.map((t) => {
            if (t.threadId !== id || !t.unread) return t;
            cleared = t.unread;
            return { ...t, unread: 0 };
          });
          if (cleared > 0) {
            setUnreadTotal((total) => Math.max(0, total - cleared));
          }
          return next;
        });
        socket.emit("networking:dm:read", { quizId, threadId: id });
      };

      if (threadId) {
        setActiveThreadId(threadId);
        socket.emit("networking:dm:history", { quizId, threadId, limit: 40 });
        markThreadSeen(threadId);
      } else if (fromThread) {
        setActiveThreadId(fromThread.threadId);
        socket.emit("networking:dm:history", {
          quizId,
          threadId: fromThread.threadId,
          limit: 40,
        });
        markThreadSeen(fromThread.threadId);
      } else {
        setActiveThreadId(null);
        setMessages([]);
      }
    },
    [enabled, guests, quizId, threads],
  );

  const sendDm = useCallback(
    (text: string) => {
      if (!quizId || !enabled || !activePeerId) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      socket.emit("networking:dm:send", { quizId, peerId: activePeerId, text: trimmed });
    },
    [activePeerId, enabled, quizId],
  );

  const closeChat = useCallback(() => {
    setActiveThreadId(null);
    setActivePeerId(null);
    setActivePeerLabel("");
    setActivePeerAvatarUrl("");
    setChatReturnTab(null);
    setMessages([]);
  }, []);

  const loadMoreThreads = useCallback(() => {
    if (!quizId || !enabled) return;
    if (!threadsHasMoreRef.current || threadsLoadingMoreRef.current) return;
    setThreadsLoadingMore(true);
    socket.emit("networking:threads:list", {
      quizId,
      limit: NETWORKING_THREADS_PAGE_SIZE,
      offset: threadsLenRef.current,
    });
  }, [enabled, quizId]);

  return {
    selfParticipantId,
    profile,
    guests,
    guestsTotal,
    guestsQuery,
    guestsPage,
    guestsPageCount,
    guestsPageSize: NETWORKING_GUESTS_PAGE_SIZE,
    setGuestsQuery,
    refreshGuests,
    refreshProfile,
    goToGuestsPage,
    saveProfile,
    threads,
    threadsTotal,
    threadsHasMore,
    threadsLoadingMore,
    loadMoreThreads,
    activeThreadId,
    activePeerId,
    activePeerLabel,
    activePeerAvatarUrl,
    chatReturnTab,
    messages,
    openChatWithPeer,
    sendDm,
    closeChat,
    unreadTotal,
  };
}
