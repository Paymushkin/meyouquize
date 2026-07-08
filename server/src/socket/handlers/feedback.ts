import type { Server } from "socket.io";
import {
  feedbackFormActionSchema,
  feedbackInjectedResponseAddSchema,
  feedbackInjectedResponseRemoveSchema,
  feedbackQuizIdSchema,
  feedbackScaleCountOverrideClearSchema,
  feedbackScaleCountOverrideSchema,
  submitFeedbackSchema,
} from "../../schemas.js";
import { getQuizPublicState } from "../../quiz-service.js";
import { broadcastQuizPublicState, emitToQuizDashboard, quizDashboardRoom } from "../quiz-rooms.js";
import type { EnrichedSocket } from "../handler-common.js";
import { assertAdmin, fail } from "../handler-common.js";
import { allowSocketAction } from "../action-rate-limit.js";
import {
  activateFeedbackForm,
  addInjectedFeedbackResponse,
  clearAllFeedbackScaleCountOverrides,
  clearFeedbackScaleCountOverride,
  closeFeedbackForm,
  emitAllFeedbackResultsForQuiz,
  getFeedbackResultsByFormId,
  listFeedbackResultsByQuizId,
  resetFeedbackFormResponses,
  removeInjectedFeedbackResponse,
  setFeedbackScaleCountOverride,
  submitFeedbackResponse,
} from "../../feedback-service.js";

async function broadcastFeedbackResults(io: Server, quizId: string) {
  await emitAllFeedbackResultsForQuiz(
    (payload) => emitToQuizDashboard(io, quizId, "feedback:results", payload),
    quizId,
  );
}

export function registerFeedbackHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("feedback:activate", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackFormActionSchema.parse(raw);
      const quizId = await activateFeedbackForm(payload.formId);
      if (quizId !== payload.quizId) throw new Error("Invalid feedback form");
      const state = await getQuizPublicState(payload.quizId);
      if (state) await broadcastQuizPublicState(io, payload.quizId, state);
      await broadcastFeedbackResults(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Activate feedback failed");
    }
  });

  socket.on("feedback:close", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackFormActionSchema.parse(raw);
      const quizId = await closeFeedbackForm(payload.formId);
      if (!quizId || quizId !== payload.quizId) throw new Error("Invalid feedback form");
      const state = await getQuizPublicState(payload.quizId);
      if (state) await broadcastQuizPublicState(io, payload.quizId, state);
      await broadcastFeedbackResults(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Close feedback failed");
    }
  });

  socket.on("feedback:submit", async (raw: unknown) => {
    try {
      if (
        !allowSocketAction({
          socketId: socket.id,
          action: "feedback:submit",
          windowMs: 60_000,
          maxPerWindow: 10,
        })
      ) {
        fail(socket, "Слишком частая отправка формы обратной связи. Подождите немного.");
        return;
      }
      const payload = submitFeedbackSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      if (!socket.data.quizId || socket.data.quizId !== payload.quizId)
        throw new Error("Not joined");
      const formId = await submitFeedbackResponse({
        quizId: payload.quizId,
        participantId: socket.data.participantId,
        scaleAnswers: payload.scaleAnswers,
        openFieldAnswers: payload.openFieldAnswers,
        comment: payload.comment,
      });
      socket.emit("feedback:submitted", { ok: true });
      socket.emit("player:feedback-status", { submitted: true });
      if (formId) {
        const results = await getFeedbackResultsByFormId(formId);
        if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
      }
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Submit feedback failed");
    }
  });

  socket.on("feedback:reset-results", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackFormActionSchema.parse(raw);
      await resetFeedbackFormResponses(payload.formId, payload.quizId);
      await broadcastFeedbackResults(io, payload.quizId);
      const state = await getQuizPublicState(payload.quizId);
      if (state) await broadcastQuizPublicState(io, payload.quizId, state);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Reset feedback failed");
    }
  });

  socket.on("feedback:scale-count:set", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackScaleCountOverrideSchema.parse(raw);
      await setFeedbackScaleCountOverride(payload);
      const results = await getFeedbackResultsByFormId(payload.formId);
      if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set feedback scale count failed");
    }
  });

  socket.on("feedback:scale-count:clear", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackScaleCountOverrideClearSchema.parse(raw);
      await clearFeedbackScaleCountOverride(payload);
      const results = await getFeedbackResultsByFormId(payload.formId);
      if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Clear feedback scale count failed");
    }
  });

  socket.on("feedback:scale-count:clear-all", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackFormActionSchema.parse(raw);
      await clearAllFeedbackScaleCountOverrides(payload.formId, payload.quizId);
      const results = await getFeedbackResultsByFormId(payload.formId);
      if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
    } catch (error) {
      fail(
        socket,
        error instanceof Error ? error.message : "Clear all feedback scale counts failed",
      );
    }
  });

  socket.on("feedback:response:add", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackInjectedResponseAddSchema.parse(raw);
      await addInjectedFeedbackResponse(payload);
      const results = await getFeedbackResultsByFormId(payload.formId);
      if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Add feedback response failed");
    }
  });

  socket.on("feedback:response:remove", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackInjectedResponseRemoveSchema.parse(raw);
      await removeInjectedFeedbackResponse(payload);
      const results = await getFeedbackResultsByFormId(payload.formId);
      if (results) emitToQuizDashboard(io, payload.quizId, "feedback:results", results);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Remove feedback response failed");
    }
  });

  socket.on("feedback:results:subscribe", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = feedbackQuizIdSchema.parse(raw);
      await socket.join(quizDashboardRoom(payload.quizId));
      const results = await listFeedbackResultsByQuizId(payload.quizId);
      for (const item of results) {
        socket.emit("feedback:results", item);
      }
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Subscribe feedback failed");
    }
  });
}
