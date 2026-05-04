import type { Server } from "socket.io";
import {
  activateQuestionSchema,
  closeQuestionSchema,
  closeSubQuizSchema,
  createQuizSchema,
  finishQuizSchema,
  refreshQuizStateSchema,
  startReactionSessionSchema,
  startSubQuizAutoSchema,
  stopReactionSessionSchema,
  toggleQuestionSchema,
} from "../../schemas.js";
import {
  activateNextQuestion,
  closeQuestion,
  closeSubQuiz,
  createQuiz,
  finishQuiz,
  getQuizPublicState,
  setQuestionEnabled,
  startSubQuizAuto,
} from "../../quiz-service.js";
import { startReactionSession, stopReactionSession } from "../../reactions-service.js";
import { persistReactionWidgetCounts } from "../../reaction-widget-stats.js";
import { broadcastDashboardResultsNow } from "../dashboard-results.js";
import { emitToQuizPlayersAndDashboard } from "../quiz-rooms.js";
import type { EnrichedSocket } from "../handler-common.js";
import { assertAdmin, fail } from "../handler-common.js";

const reactionStopTimers = new Map<string, NodeJS.Timeout>();
const recentAdminCommands = new Map<string, number>();
const ADMIN_COMMAND_DEDUP_WINDOW_MS = 1200;

function shouldSkipDuplicateCommand(socketId: string, eventName: string, raw: unknown): boolean {
  const now = Date.now();
  for (const [key, timestamp] of recentAdminCommands) {
    if (now - timestamp > ADMIN_COMMAND_DEDUP_WINDOW_MS) {
      recentAdminCommands.delete(key);
    }
  }
  const fingerprint = `${socketId}:${eventName}:${JSON.stringify(raw)}`;
  const prev = recentAdminCommands.get(fingerprint);
  if (prev && now - prev <= ADMIN_COMMAND_DEDUP_WINDOW_MS) {
    return true;
  }
  recentAdminCommands.set(fingerprint, now);
  return false;
}

export function registerQuizAdminHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("quiz:create", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = createQuizSchema.parse(raw);
      const quiz = await createQuiz(payload);
      socket.emit("quiz:created", quiz);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Create failed");
    }
  });

  socket.on("question:activate", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      if (shouldSkipDuplicateCommand(socket.id, "question:activate", raw)) return;
      const payload = activateQuestionSchema.parse(raw);
      const state = await activateNextQuestion(payload.quizId, payload.subQuizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Activate failed");
    }
  });

  socket.on("question:close", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      if (shouldSkipDuplicateCommand(socket.id, "question:close", raw)) return;
      const payload = closeQuestionSchema.parse(raw);
      await closeQuestion(payload.quizId, payload.questionId);
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Close failed");
    }
  });

  socket.on("question:toggle", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = toggleQuestionSchema.parse(raw);
      const state = await setQuestionEnabled(payload.quizId, payload.questionId, payload.enabled);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Toggle failed");
    }
  });

  socket.on("quiz:finish", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      if (shouldSkipDuplicateCommand(socket.id, "quiz:finish", raw)) return;
      const payload = finishQuizSchema.parse(raw);
      const state = await finishQuiz(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Finish failed");
    }
  });

  socket.on("quiz:state:refresh", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = refreshQuizStateSchema.parse(raw);
      const state = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Refresh state failed");
    }
  });

  socket.on("reactions:start", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = startReactionSessionSchema.parse(raw);
      const session = startReactionSession(payload.quizId, payload.durationSec, payload.reactions);
      await persistReactionWidgetCounts(payload.quizId, session.reactions, session.counts);
      const prevTimer = reactionStopTimers.get(payload.quizId);
      if (prevTimer) clearTimeout(prevTimer);
      const timer = setTimeout(async () => {
        reactionStopTimers.delete(payload.quizId);
        try {
          stopReactionSession(payload.quizId);
          const autoState = await getQuizPublicState(payload.quizId);
          emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", autoState);
        } catch {
          // ignore timer errors
        }
      }, payload.durationSec * 1000);
      reactionStopTimers.set(payload.quizId, timer);
      const state = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Start reactions failed");
    }
  });

  socket.on("reactions:stop", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = stopReactionSessionSchema.parse(raw);
      stopReactionSession(payload.quizId);
      const prevTimer = reactionStopTimers.get(payload.quizId);
      if (prevTimer) {
        clearTimeout(prevTimer);
        reactionStopTimers.delete(payload.quizId);
      }
      const state = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Stop reactions failed");
    }
  });

  socket.on("sub-quiz:close", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      if (shouldSkipDuplicateCommand(socket.id, "sub-quiz:close", raw)) return;
      const payload = closeSubQuizSchema.parse(raw);
      const state = await closeSubQuiz(payload.quizId, payload.subQuizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Close sub-quiz failed");
    }
  });

  socket.on("sub-quiz:start-auto", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      if (shouldSkipDuplicateCommand(socket.id, "sub-quiz:start-auto", raw)) return;
      const payload = startSubQuizAutoSchema.parse(raw);
      const state = await startSubQuizAuto(payload.quizId, payload.subQuizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Start auto sub-quiz failed");
    }
  });
}
