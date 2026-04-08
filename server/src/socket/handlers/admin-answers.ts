import type { Server } from "socket.io";
import { resetAnswersSchema, resetQuestionAnswersSchema } from "../../schemas.js";
import {
  resetAllQuizAnswers,
  resetQuestionAnswers,
} from "../../quiz-service.js";
import { broadcastDashboardResultsNow } from "../dashboard-results.js";
import { emitToQuizPlayersAndDashboard } from "../quiz-rooms.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";

export function registerAdminAnswerHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("admin:answers:reset-question", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = resetQuestionAnswersSchema.parse(raw);
      await resetQuestionAnswers(payload.quizId, payload.questionId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "answers:cleared", { questionId: payload.questionId });
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Reset question failed");
    }
  });

  socket.on("admin:answers:reset-all", async (raw: unknown) => {
    try {
      if (!socket.data.isAdmin) throw new Error("Forbidden");
      const payload = resetAnswersSchema.parse(raw);
      await resetAllQuizAnswers(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "answers:cleared", { all: true });
      await broadcastDashboardResultsNow(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Reset all failed");
    }
  });
}
