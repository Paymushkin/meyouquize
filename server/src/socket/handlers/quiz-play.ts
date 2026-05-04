import type { Server } from "socket.io";
import {
  joinQuizSchema,
  resetAnswersSchema,
  submitAnswerSchema,
  toggleReactionSchema,
  updateNicknameSchema,
} from "../../schemas.js";
import {
  getParticipantAnswersMap,
  getQuizPublicState,
  joinQuiz,
  resetParticipantAnswers,
  submitAnswer,
  updateParticipantNickname,
} from "../../quiz-service.js";
import {
  broadcastDashboardResultsNow,
  scheduleDashboardResultsBroadcast,
} from "../dashboard-results.js";
import {
  emitQuizOnlineCount,
  emitToQuizPlayersAndDashboard,
  quizPlayerRoom,
} from "../quiz-rooms.js";
import { allowAnswerSubmit } from "../submit-rate-limit.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";
import { addReaction } from "../../reactions-service.js";
import { persistReactionWidgetCounts } from "../../reaction-widget-stats.js";

const REACTION_WINDOW_MS = 1000;
const REACTION_MAX_PER_WINDOW = 10;
const reactionRateBySocket = new Map<string, number[]>();

function allowReactionBurst(socketId: string): boolean {
  const now = Date.now();
  const arr = reactionRateBySocket.get(socketId) ?? [];
  const fresh = arr.filter((ts) => now - ts <= REACTION_WINDOW_MS);
  if (fresh.length >= REACTION_MAX_PER_WINDOW) {
    reactionRateBySocket.set(socketId, fresh);
    return false;
  }
  fresh.push(now);
  reactionRateBySocket.set(socketId, fresh);
  return true;
}

export function registerQuizPlayHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("quiz:join", async (raw: unknown) => {
    try {
      const payload = joinQuizSchema.parse(raw);
      const joined = await joinQuiz(payload);
      const state = await getQuizPublicState(joined.quizId);
      const answersMap = await getParticipantAnswersMap(joined.quizId, joined.participantId);
      socket.data.participantId = joined.participantId;
      socket.data.quizId = joined.quizId;
      await socket.join(quizPlayerRoom(joined.quizId));
      socket.emit("quiz:joined", { ok: true });
      socket.emit("player:answers", answersMap);
      socket.emit("state:quiz", state);
      await emitQuizOnlineCount(io, joined.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Join failed");
    }
  });

  socket.on("answer:submit", async (raw: unknown) => {
    try {
      if (!allowAnswerSubmit(socket.id)) {
        fail(socket, "Too many answers in a short time. Please wait.");
        return;
      }
      const payload = submitAnswerSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      await submitAnswer({ ...payload, participantId: socket.data.participantId });
      socket.emit("answer:submitted", { ok: true });
      scheduleDashboardResultsBroadcast(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Submit failed");
    }
  });

  socket.on("answers:reset", async (raw: unknown) => {
    try {
      const payload = resetAnswersSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      await resetParticipantAnswers(payload.quizId, socket.data.participantId);
      socket.emit("answers:reset:done", { ok: true });
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Reset failed");
    }
  });

  socket.on("quiz:nickname:update", async (raw: unknown) => {
    try {
      const payload = updateNicknameSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (socket.data.quizId !== payload.quizId) throw new Error("Not joined");
      const updated = await updateParticipantNickname({
        quizId: payload.quizId,
        participantId: socket.data.participantId,
        nickname: payload.nickname,
      });
      socket.emit("quiz:nickname:updated", { nickname: updated.nickname });
      const state = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Update nickname failed");
    }
  });

  socket.on("reaction:toggle", async (raw: unknown) => {
    try {
      const payload = toggleReactionSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (!allowReactionBurst(socket.id)) return;
      const reactionSession = addReaction(
        payload.quizId,
        socket.data.participantId,
        payload.reactionType,
      );
      if (reactionSession) {
        await persistReactionWidgetCounts(
          payload.quizId,
          reactionSession.reactions,
          reactionSession.counts,
        );
      }
      const state = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Toggle reaction failed");
    }
  });
}
