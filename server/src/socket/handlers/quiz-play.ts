import type { Server } from "socket.io";
import { joinQuizSchema, resetAnswersSchema, submitAnswerSchema } from "../../schemas.js";
import {
  getParticipantAnswersMap,
  getQuizPublicState,
  joinQuiz,
  resetParticipantAnswers,
  submitAnswer,
} from "../../quiz-service.js";
import { broadcastDashboardResultsNow, scheduleDashboardResultsBroadcast } from "../dashboard-results.js";
import { quizPlayerRoom } from "../quiz-rooms.js";
import { allowAnswerSubmit } from "../submit-rate-limit.js";
import type { EnrichedSocket } from "../handler-common.js";
import { fail } from "../handler-common.js";

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
}
