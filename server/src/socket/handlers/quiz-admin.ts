import type { Server } from "socket.io";
import {
  activateQuestionSchema,
  closeQuestionSchema,
  closeSubQuizSchema,
  createQuizSchema,
  finishQuizSchema,
  toggleQuestionSchema,
} from "../../schemas.js";
import {
  activateNextQuestion,
  closeQuestion,
  closeSubQuiz,
  createQuiz,
  finishQuiz,
  setQuestionEnabled,
} from "../../quiz-service.js";
import { broadcastDashboardResultsNow } from "../dashboard-results.js";
import { emitToQuizPlayersAndDashboard } from "../quiz-rooms.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";

export function registerQuizAdminHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("quiz:create", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = createQuizSchema.parse(raw);
      const quiz = await createQuiz(payload);
      socket.emit("quiz:created", quiz);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Create failed");
    }
  });

  socket.on("question:activate", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = activateQuestionSchema.parse(raw);
      const state = await activateNextQuestion(payload.quizId, payload.subQuizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Activate failed");
    }
  });

  socket.on("question:close", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = closeQuestionSchema.parse(raw);
      await closeQuestion(payload.quizId, payload.questionId);
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Close failed");
    }
  });

  socket.on("question:toggle", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = toggleQuestionSchema.parse(raw);
      const state = await setQuestionEnabled(payload.quizId, payload.questionId, payload.enabled);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Toggle failed");
    }
  });

  socket.on("quiz:finish", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = finishQuizSchema.parse(raw);
      const state = await finishQuiz(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Finish failed");
    }
  });

  socket.on("sub-quiz:close", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = closeSubQuizSchema.parse(raw);
      const state = await closeSubQuiz(payload.quizId, payload.subQuizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", state);
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Close sub-quiz failed");
    }
  });
}
