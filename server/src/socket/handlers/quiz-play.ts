import type { Server } from "socket.io";
import {
  joinQuizSchema,
  playerSubQuizReportRequestSchema,
  resetAnswersSchema,
  submitAnswerSchema,
  bannerClickSchema,
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
import { schedulePlayerQuizScoreEmit } from "../../submit-player-score.js";
import { hasParticipantSubmittedFeedback } from "../../feedback-service.js";
import {
  broadcastDashboardResultsNow,
  scheduleDashboardResultsBroadcast,
} from "../dashboard-results.js";
import { broadcastQuizPublicState, emitQuizOnlineCount, quizPlayerRoom } from "../quiz-rooms.js";
import { allowAnswerSubmit } from "../submit-rate-limit.js";
import { allowSocketAction } from "../action-rate-limit.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";
import { addReaction } from "../../reactions-service.js";
import { persistReactionWidgetCounts } from "../../reaction-widget-stats.js";
import {
  broadcastPublicViewToDashboard,
  persistBannerUniqueClick,
} from "../../banner-click-stats.js";
import {
  trialErrorMessage,
  trialLog,
  trialQuizStatePayload,
  trialSocketPayload,
} from "../trial-logs.js";

const REACTION_WINDOW_MS = 1000;
const REACTION_MAX_PER_WINDOW = 10;
const JOIN_DEBOUNCE_MS = 2500;
const JOIN_RATE_WINDOW_MS = 60_000;
const JOIN_RATE_MAX_PER_WINDOW = 5;
const ANSWERS_RESET_RATE_WINDOW_MS = 60_000;
const ANSWERS_RESET_RATE_MAX_PER_WINDOW = 3;
const NICKNAME_UPDATE_RATE_WINDOW_MS = 60_000;
const NICKNAME_UPDATE_RATE_MAX_PER_WINDOW = 10;
const BANNER_CLICK_RATE_WINDOW_MS = 60_000;
const BANNER_CLICK_RATE_MAX_PER_WINDOW = 20;
const SUB_QUIZ_REPORT_RATE_WINDOW_MS = 60_000;
const SUB_QUIZ_REPORT_RATE_MAX_PER_WINDOW = 5;
const reactionRateBySocket = new Map<string, number[]>();
const lastJoinAckBySocket = new Map<
  string,
  { at: number; quizId: string; participantId: string; nickname: string }
>();

export function cleanupQuizPlaySocketState(socketId: string) {
  reactionRateBySocket.delete(socketId);
  lastJoinAckBySocket.delete(socketId);
}

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
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "quiz:join",
          windowMs: JOIN_RATE_WINDOW_MS,
          maxPerWindow: JOIN_RATE_MAX_PER_WINDOW,
        })
      ) {
        fail(socket, "Слишком много попыток подключения. Подождите немного и попробуйте снова.");
        return;
      }
      const payload = joinQuizSchema.parse(raw);
      const recent = lastJoinAckBySocket.get(socket.id);
      const now = Date.now();
      if (
        recent &&
        now - recent.at < JOIN_DEBOUNCE_MS &&
        socket.data.participantId === recent.participantId &&
        socket.data.quizId === recent.quizId
      ) {
        socket.emit("quiz:joined", { ok: true, nickname: recent.nickname });
        return;
      }
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
      socket.emit("quiz:joined", { ok: true, nickname: joined.nickname });
      socket.emit("player:answers", answersMap);
      const feedbackSubmitted = await hasParticipantSubmittedFeedback(
        joined.quizId,
        joined.participantId,
      );
      socket.emit("player:feedback-status", { submitted: feedbackSubmitted });
      socket.emit("state:quiz", {
        ...state,
        myTotalScore,
        mySubQuizScores,
        feedbackSubmitted,
      });
      lastJoinAckBySocket.set(socket.id, {
        at: Date.now(),
        quizId: joined.quizId,
        participantId: joined.participantId,
        nickname: joined.nickname,
      });
      trialLog("quiz_join_ok", {
        quizId: joined.quizId,
        participantId: joined.participantId,
        ...trialSocketPayload(socket.id),
        ...trialQuizStatePayload(state),
      });
      emitQuizOnlineCount(io, joined.quizId);
    } catch (error) {
      trialLog("quiz_join_error", {
        ...trialSocketPayload(socket.id),
        error: trialErrorMessage(error, "Join failed"),
      });
      const message = error instanceof Error ? error.message : "Join failed";
      fail(socket, message);
    }
  });

  socket.on("answer:submit", async (raw: unknown) => {
    try {
      if (!allowAnswerSubmit(socket.id)) {
        trialLog("answer_submit_rate_limited", trialSocketPayload(socket.id));
        fail(socket, "Too many answers in a short time. Please wait.");
        return;
      }
      const payload = submitAnswerSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (socket.data.quizId !== payload.quizId) throw new Error("Not joined");
      await submitAnswer({
        ...payload,
        participantId: socket.data.participantId,
        trustedParticipant: true,
      });
      socket.emit("answer:submitted", { ok: true });
      scheduleDashboardResultsBroadcast(io, payload.quizId);
      schedulePlayerQuizScoreEmit(socket, payload.quizId, socket.data.participantId);
      trialLog("answer_submit_ok", {
        quizId: payload.quizId,
        questionId: payload.questionId,
        participantId: socket.data.participantId,
        ...trialSocketPayload(socket.id),
      });
    } catch (error) {
      const payload =
        raw && typeof raw === "object" && "quizId" in raw && "questionId" in raw
          ? (raw as { quizId?: string; questionId?: string })
          : {};
      trialLog("answer_submit_error", {
        quizId: payload.quizId ?? null,
        questionId: payload.questionId ?? null,
        participantId: socket.data.participantId ?? null,
        ...trialSocketPayload(socket.id),
        error: trialErrorMessage(error, "Submit failed"),
      });
      fail(socket, error instanceof Error ? error.message : "Submit failed");
    }
  });

  socket.on("answers:reset", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "answers:reset",
          windowMs: ANSWERS_RESET_RATE_WINDOW_MS,
          maxPerWindow: ANSWERS_RESET_RATE_MAX_PER_WINDOW,
        })
      ) {
        return;
      }
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
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "quiz:nickname:update",
          windowMs: NICKNAME_UPDATE_RATE_WINDOW_MS,
          maxPerWindow: NICKNAME_UPDATE_RATE_MAX_PER_WINDOW,
        })
      ) {
        return;
      }
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
      const message = error instanceof Error ? error.message : "Update nickname failed";
      fail(socket, message);
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

  socket.on("banner:click", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "banner:click",
          windowMs: BANNER_CLICK_RATE_WINDOW_MS,
          maxPerWindow: BANNER_CLICK_RATE_MAX_PER_WINDOW,
        })
      ) {
        return;
      }
      const payload = bannerClickSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (socket.data.quizId !== payload.quizId) throw new Error("Not joined");
      const recorded = await persistBannerUniqueClick(
        payload.quizId,
        payload.bannerId,
        socket.data.participantId,
      );
      if (recorded) {
        await broadcastPublicViewToDashboard(io, payload.quizId);
      }
    } catch {
      // Клик по баннеру не должен мешать переходу по ссылке у игрока.
    }
  });

  socket.on("player:sub-quiz-report:request", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "player:sub-quiz-report:request",
          windowMs: SUB_QUIZ_REPORT_RATE_WINDOW_MS,
          maxPerWindow: SUB_QUIZ_REPORT_RATE_MAX_PER_WINDOW,
        })
      ) {
        return;
      }
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
