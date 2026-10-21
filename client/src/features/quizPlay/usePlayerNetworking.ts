import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../../socket";

export type NetworkingProfile = {
  fullName: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
  visibleInDirectory: boolean;
};

export type NetworkingGuest = {
  participantId: string;
  nickname: string;
  fullName: string;
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
  activeThreadIdRef.current = activeThreadId;
  activePeerIdRef.current = activePeerId;
  selfIdRef.current = selfParticipantId;

  useEffect(() => {
    if (!enabled || !joined || !quizId) return;

    socket.emit("networking:join", { quizId });
    socket.emit("networking:profile:get", { quizId });
    socket.emit("networking:threads:list", { quizId });
    socket.emit("networking:guests:list", {
      quizId,
      limit: NETWORKING_GUESTS_PAGE_SIZE,
      offset: 0,
    });
    setGuestsPage(0);

    const onJoined = (payload: { quizId?: string; participantId?: string }) => {
      if (payload.quizId !== quizId) return;
      if (typeof payload.participantId === "string") setSelfParticipantId(payload.participantId);
    };
    const onProfile = (payload: { participantId?: string; profile?: NetworkingProfile | null }) => {
      const selfId = selfIdRef.current;
      if (selfId && payload.participantId && payload.participantId !== selfId) return;
      const nextProfile = payload.profile ?? null;
      setProfile(nextProfile);
      if (selfId && nextProfile) {
        setGuests((prev) => {
          const patched = prev.map((g) =>
            g.participantId === selfId
              ? {
                  ...g,
                  fullName: nextProfile.fullName,
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
        });
      }
    };
    const onGuests = (payload: { quizId?: string; total?: number; guests?: NetworkingGuest[] }) => {
      if (payload.quizId !== quizId) return;
      let next = Array.isArray(payload.guests) ? payload.guests : [];
      const selfId = selfIdRef.current;
      if (selfId) {
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
    const onThreads = (payload: { quizId?: string; threads?: NetworkingThread[] }) => {
      if (payload.quizId !== quizId) return;
      setThreads(Array.isArray(payload.threads) ? payload.threads : []);
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
      } else if (!activeId && peerId && (dto.senderId === peerId || dto.senderId === selfId)) {
        setActiveThreadId(dto.threadId);
        setMessages((prev) => (prev.some((m) => m.id === dto.id) ? prev : [...prev, dto]));
      }
      socket.emit("networking:threads:list", { quizId });
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
      if (selfId) {
        setProfile((prev) => ({
          fullName: patch.fullName ?? prev?.fullName ?? "",
          company: patch.company ?? prev?.company ?? "",
          avatarUrl: patch.avatarUrl ?? prev?.avatarUrl ?? "",
          offers: patch.offers ?? prev?.offers ?? "",
          seeking: patch.seeking ?? prev?.seeking ?? "",
          visibleInDirectory: patch.visibleInDirectory ?? prev?.visibleInDirectory ?? true,
        }));
        setGuests((prev) => {
          const patched = prev.map((g) =>
            g.participantId === selfId
              ? {
                  ...g,
                  fullName: patch.fullName ?? g.fullName,
                  company: patch.company ?? g.company,
                  avatarUrl: patch.avatarUrl ?? g.avatarUrl,
                  offers: patch.offers ?? g.offers,
                  seeking: patch.seeking ?? g.seeking,
                  hasProfile: true,
                }
              : g,
          );
          const selfIdx = patched.findIndex((g) => g.participantId === selfId);
          if (selfIdx <= 0) {
            if (selfIdx < 0 && guestsPage === 0) {
              return [
                {
                  participantId: selfId,
                  nickname: "",
                  fullName: patch.fullName ?? "",
                  company: patch.company ?? "",
                  avatarUrl: patch.avatarUrl ?? "",
                  offers: patch.offers ?? "",
                  seeking: patch.seeking ?? "",
                  online: true,
                  hasProfile: true,
                },
                ...patched,
              ];
            }
            return patched;
          }
          const next = [...patched];
          const [self] = next.splice(selfIdx, 1);
          next.unshift(self!);
          return next;
        });
      }
      socket.emit("networking:profile:set", { quizId, ...patch });
      socket.emit("networking:guests:list", {
        quizId,
        query: guestsQuery,
        limit: NETWORKING_GUESTS_PAGE_SIZE,
        offset: guestsPage * NETWORKING_GUESTS_PAGE_SIZE,
      });
    },
    [enabled, guestsPage, guestsQuery, quizId],
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
      if (threadId) {
        setActiveThreadId(threadId);
        socket.emit("networking:dm:history", { quizId, threadId, limit: 40 });
        socket.emit("networking:dm:read", { quizId, threadId });
      } else if (fromThread) {
        setActiveThreadId(fromThread.threadId);
        socket.emit("networking:dm:history", {
          quizId,
          threadId: fromThread.threadId,
          limit: 40,
        });
        socket.emit("networking:dm:read", { quizId, threadId: fromThread.threadId });
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

  const unreadTotal = threads.reduce((sum, t) => sum + (t.unread || 0), 0);

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
    goToGuestsPage,
    saveProfile,
    threads,
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
