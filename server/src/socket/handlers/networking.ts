import type { Server } from "socket.io";
import { z } from "zod";
import { allowSocketAction } from "../action-rate-limit.js";
import { assertAdmin, fail, type EnrichedSocket } from "../handler-common.js";
import {
  assertNetworkingEnabled,
  assertParticipantsInQuiz,
  countNetworkingUnreadTotal,
  getParticipantProfile,
  isNetworkingEnabledForQuiz,
  listNetworkingGuests,
  listThreadMessages,
  listThreadsForParticipant,
  listOnlineParticipantIds,
  markThreadRead,
  sendNetworkingMessage,
  toPublicNetworkingProfile,
  touchNetworkingPresence,
  upsertParticipantProfile,
} from "../../networking-service.js";
import { getStoredPublicView, saveStoredPublicView } from "../public-view-store.js";
import {
  broadcastQuizPublicState,
  emitToQuizDashboard,
  emitToQuizPlayers,
  quizPlayerRoom,
} from "../quiz-rooms.js";
import { getQuizPublicState } from "../../quiz-service.js";
import { toPublicViewPayload } from "../public-view-helpers.js";
import { normalizePublicViewState } from "@meyouquize/shared";

/** Клиенты перезапрашивают свой текущий список гостей. */
function broadcastNetworkingGuestsChanged(io: Server, quizId: string) {
  emitToQuizPlayers(io, quizId, "networking:guests:changed", { quizId });
}

/** DM/unread: сокеты игрока в комнате квиза (+ networking-комната на случай гонки join). */
async function emitToNetworkingParticipant(
  io: Server,
  quizId: string,
  participantId: string,
  event: string,
  payload: unknown,
) {
  const seen = new Set<string>();
  const sockets = await io.in(quizPlayerRoom(quizId)).fetchSockets();
  for (const sk of sockets) {
    if (sk.data?.participantId !== participantId) continue;
    seen.add(sk.id);
    sk.emit(event, payload);
  }
  // Fallback, если сокет ещё не в quiz-room, но уже в networking:participant.
  const roomSockets = await io.in(participantRoom(participantId)).fetchSockets();
  for (const sk of roomSockets) {
    if (seen.has(sk.id)) continue;
    sk.emit(event, payload);
  }
}

function requireJoined(socket: EnrichedSocket, quizId: string): string {
  if (!socket.data.participantId) throw new Error("Not joined");
  if (!socket.data.quizId || socket.data.quizId !== quizId) throw new Error("Not joined");
  return socket.data.participantId;
}

/** Проверяет, что participant ещё есть в квизе (после demo-seed id на сокете может устареть). */
async function requireLiveParticipant(socket: EnrichedSocket, quizId: string): Promise<string> {
  const participantId = requireJoined(socket, quizId);
  try {
    await assertParticipantsInQuiz(quizId, [participantId]);
  } catch {
    socket.data.participantId = undefined;
    // Клиент ловит "Participant not found" и делает restore join.
    throw new Error("Participant not found");
  }
  return participantId;
}

function participantRoom(participantId: string) {
  return `networking:participant:${participantId}`;
}

export function registerNetworkingHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("admin:networking:set-enabled", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = z.object({ quizId: z.string().min(1), enabled: z.boolean() }).parse(raw);
      const view = await getStoredPublicView(payload.quizId);
      const next = normalizePublicViewState({
        ...view,
        networkingEnabled: payload.enabled,
      });
      await saveStoredPublicView(payload.quizId, next);
      const quiz = await getQuizPublicState(payload.quizId);
      if (quiz) {
        emitToQuizDashboard(
          io,
          payload.quizId,
          "results:public:view",
          toPublicViewPayload(next, quiz.title),
        );
        await broadcastQuizPublicState(io, payload.quizId, quiz);
      }
      socket.emit("admin:networking:updated", {
        quizId: payload.quizId,
        networkingEnabled: payload.enabled,
        networkingJoinFormMode: next.networkingJoinFormMode,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set networking failed");
    }
  });

  socket.on("networking:join", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "networking:join",
          maxPerWindow: 20,
          windowMs: 60_000,
        })
      ) {
        throw new Error("Too many requests");
      }
      const payload = z.object({ quizId: z.string().min(1) }).parse(raw);
      await assertNetworkingEnabled(payload.quizId);
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await socket.join(participantRoom(participantId));
      await touchNetworkingPresence(payload.quizId, participantId);
      socket.emit("networking:joined", { quizId: payload.quizId, participantId });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Networking join failed");
    }
  });

  socket.on("networking:presence:touch", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "networking:presence",
          maxPerWindow: 30,
          windowMs: 60_000,
        })
      ) {
        return;
      }
      const payload = z.object({ quizId: z.string().min(1) }).parse(raw);
      if (!(await isNetworkingEnabledForQuiz(payload.quizId))) return;
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await touchNetworkingPresence(payload.quizId, participantId);
    } catch {
      /* ignore */
    }
  });

  socket.on("networking:profile:get", async (raw: unknown) => {
    try {
      const payload = z
        .object({
          quizId: z.string().min(1),
          participantId: z.string().min(1).optional(),
        })
        .parse(raw);
      const selfId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const targetId = payload.participantId ?? selfId;
      const profile = await getParticipantProfile(targetId);
      socket.emit("networking:profile", {
        participantId: targetId,
        profile: profile ? toPublicNetworkingProfile(profile, targetId) : null,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Get profile failed");
    }
  });

  socket.on("networking:profile:set", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "networking:profile:set",
          maxPerWindow: 20,
          windowMs: 60_000,
        })
      ) {
        throw new Error("Too many requests");
      }
      const payload = z
        .object({
          quizId: z.string().min(1),
          fullName: z.string().max(120).optional(),
          jobTitle: z.string().max(120).optional(),
          company: z.string().max(120).optional(),
          avatarUrl: z.string().max(500).optional(),
          offers: z.string().max(500).optional(),
          seeking: z.string().max(500).optional(),
          visibleInDirectory: z.boolean().optional(),
        })
        .parse(raw);
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const profile = await upsertParticipantProfile(participantId, payload);
      socket.emit("networking:profile", {
        participantId,
        profile: toPublicNetworkingProfile(profile, participantId),
      });
      broadcastNetworkingGuestsChanged(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set profile failed");
    }
  });

  socket.on("networking:guests:list", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "networking:guests",
          maxPerWindow: 40,
          windowMs: 60_000,
        })
      ) {
        throw new Error("Too many requests");
      }
      const payload = z
        .object({
          quizId: z.string().min(1),
          query: z.string().max(80).optional(),
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).max(10_000).optional(),
        })
        .parse(raw);
      const viewerParticipantId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const onlineIds = await listOnlineParticipantIds(payload.quizId);
      const result = await listNetworkingGuests({
        ...payload,
        onlineIds,
        viewerParticipantId,
      });
      socket.emit("networking:guests", { quizId: payload.quizId, ...result });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "List guests failed");
    }
  });

  socket.on("networking:threads:list", async (raw: unknown) => {
    try {
      const payload = z
        .object({
          quizId: z.string().min(1),
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .parse(raw);
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const result = await listThreadsForParticipant(payload.quizId, participantId, {
        limit: payload.limit,
        offset: payload.offset,
      });
      socket.emit("networking:threads", { quizId: payload.quizId, ...result });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "List threads failed");
    }
  });

  socket.on("networking:dm:history", async (raw: unknown) => {
    try {
      const payload = z
        .object({
          quizId: z.string().min(1),
          threadId: z.string().min(1),
          limit: z.number().int().min(1).max(100).optional(),
          before: z.string().optional(),
        })
        .parse(raw);
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const messages = await listThreadMessages({
        threadId: payload.threadId,
        participantId,
        limit: payload.limit,
        before: payload.before,
      });
      socket.emit("networking:dm:history", {
        threadId: payload.threadId,
        messages,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "DM history failed");
    }
  });

  socket.on("networking:dm:send", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "networking:dm:send",
          maxPerWindow: 40,
          windowMs: 60_000,
        })
      ) {
        throw new Error("Too many requests");
      }
      const payload = z
        .object({
          quizId: z.string().min(1),
          peerId: z.string().min(1),
          text: z.string().min(1).max(2000),
        })
        .parse(raw);
      const senderId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      const { thread, message } = await sendNetworkingMessage({
        quizId: payload.quizId,
        senderId,
        peerId: payload.peerId,
        text: payload.text,
      });
      const dto = {
        id: message.id,
        threadId: thread.id,
        senderId: message.senderId,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
        readAt: null as string | null,
      };
      const peerUnreadTotal = await countNetworkingUnreadTotal(payload.quizId, payload.peerId);
      await emitToNetworkingParticipant(io, payload.quizId, senderId, "networking:dm:message", dto);
      await emitToNetworkingParticipant(
        io,
        payload.quizId,
        payload.peerId,
        "networking:dm:message",
        {
          ...dto,
          unreadTotal: peerUnreadTotal,
        },
      );
      await emitToNetworkingParticipant(io, payload.quizId, payload.peerId, "networking:unread", {
        quizId: payload.quizId,
        unreadTotal: peerUnreadTotal,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Send DM failed");
    }
  });

  socket.on("networking:dm:read", async (raw: unknown) => {
    try {
      const payload = z
        .object({ quizId: z.string().min(1), threadId: z.string().min(1) })
        .parse(raw);
      const participantId = await requireLiveParticipant(socket, payload.quizId);
      await assertNetworkingEnabled(payload.quizId);
      await markThreadRead(payload.threadId, participantId);
      const unreadTotal = await countNetworkingUnreadTotal(payload.quizId, participantId);
      socket.emit("networking:dm:read-ok", { threadId: payload.threadId });
      socket.emit("networking:unread", { quizId: payload.quizId, unreadTotal });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Mark read failed");
    }
  });
}
