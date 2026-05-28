import type { Server } from "socket.io";
import {
  joinQuizSchema,
  playerSubQuizReportRequestSchema,
  resetAnswersSchema,
  submitAnswerSchema,
  toggleReactionSchema,
  updateNicknameSchema,
} from "../../schemas.js";
import {
  getParticipantAnswersMap,
  getParticipantPersonalSubQuizReport,
  getParticipantScoresBySubQuiz,
  getParticipantTotalScoreForQuiz,
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
import { broadcastQuizPublicState, emitQuizOnlineCount, quizPlayerRoom } from "../quiz-rooms.js";
import { allowAnswerSubmit } from "../submit-rate-limit.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";
import { addReaction } from "../../reactions-service.js";
import { persistReactionWidgetCounts } from "../../reaction-widget-stats.js";
import { trialLog } from "../trial-logs.js";

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
      if (!state) throw new Error("Quiz not found");
      const [myTotalScore, mySubQuizScores, answersMap] = await Promise.all([
        getParticipantTotalScoreForQuiz(joined.quizId, joined.participantId),
        getParticipantScoresBySubQuiz(joined.quizId, joined.participantId),
        getParticipantAnswersMap(joined.quizId, joined.participantId),
      ]);
      socket.data.participantId = joined.participantId;
      socket.data.quizId = joined.quizId;
      await socket.join(quizPlayerRoom(joined.quizId));
      socket.emit("quiz:joined", { ok: true });
      socket.emit("player:answers", answersMap);
      socket.emit("state:quiz", { ...state, myTotalScore, mySubQuizScores });
      trialLog("quiz_join_ok", {
        quizId: joined.quizId,
        participantId: joined.participantId,
        socketId: socket.id,
        activeQuestions: state.activeQuestions?.length ?? 0,
        progressIndex: state.quizProgress?.index ?? null,
        progressTotal: state.quizProgress?.total ?? null,
      });
      emitQuizOnlineCount(io, joined.quizId);
    } catch (error) {
      trialLog("quiz_join_error", {
        socketId: socket.id,
        error: error instanceof Error ? error.message : "Join failed",
      });
      fail(socket, error instanceof Error ? error.message : "Join failed");
    }
  });

  socket.on("answer:submit", async (raw: unknown) => {
    try {
      if (!allowAnswerSubmit(socket.id)) {
        trialLog("answer_submit_rate_limited", { socketId: socket.id });
        fail(socket, "Too many answers in a short time. Please wait.");
        return;
      }
      const payload = submitAnswerSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      await submitAnswer({ ...payload, participantId: socket.data.participantId });
      socket.emit("answer:submitted", { ok: true });
      const [myTotalScore, mySubQuizScores] = await Promise.all([
        getParticipantTotalScoreForQuiz(payload.quizId, socket.data.participantId),
        getParticipantScoresBySubQuiz(payload.quizId, socket.data.participantId),
      ]);
      socket.emit("player:quiz-score", { myTotalScore, mySubQuizScores });
      trialLog("answer_submit_ok", {
        quizId: payload.quizId,
        questionId: payload.questionId,
        participantId: socket.data.participantId,
      });
      scheduleDashboardResultsBroadcast(io, payload.quizId);
    } catch (error) {
      const payload =
        raw && typeof raw === "object" && "quizId" in raw && "questionId" in raw
          ? (raw as { quizId?: string; questionId?: string })
          : {};
      trialLog("answer_submit_error", {
        quizId: payload.quizId ?? null,
        questionId: payload.questionId ?? null,
        participantId: socket.data.participantId ?? null,
        error: error instanceof Error ? error.message : "Submit failed",
      });
      fail(socket, error instanceof Error ? error.message : "Submit failed");
    }
  });

  socket.on("answers:reset", async (raw: unknown) => {
    try {
      const payload = resetAnswersSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      await resetParticipantAnswers(payload.quizId, socket.data.participantId);
      socket.emit("answers:reset:done", { ok: true });
      socket.emit("player:quiz-score", { myTotalScore: 0, mySubQuizScores: {} });
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
      if (!state) throw new Error("Quiz not found");
      await broadcastQuizPublicState(io, payload.quizId, state);
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
      if (!state) throw new Error("Quiz not found");
      await broadcastQuizPublicState(io, payload.quizId, state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Toggle reaction failed");
    }
  });

  socket.on("player:sub-quiz-report:request", async (raw: unknown) => {
    try {
      const payload = playerSubQuizReportRequestSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (socket.data.quizId !== payload.quizId) throw new Error("Not joined");
      const report = await getParticipantPersonalSubQuizReport(
        payload.quizId,
        socket.data.participantId,
        payload.subQuizId,
      );
      if (!report) {
        fail(socket, "Квиз для отчёта не найден");
        return;
      }
      socket.emit("player:sub-quiz-report", { report });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Report failed");
    }
  });
}
