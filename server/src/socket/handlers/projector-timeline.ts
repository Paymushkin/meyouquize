import {
  normalizeProjectorTimelineState,
  type ProjectorTimelineState,
  type ProjectorTimelineStep,
} from "@meyouquize/shared";
import type { Server } from "socket.io";
import { z } from "zod";
import {
  applyTimelineStepAndBroadcast,
  markTimelineActive,
  markTimelineInactive,
} from "../../projector-timeline-sequencer.js";
import { assertAdmin, fail, type EnrichedSocket } from "../handler-common.js";
import { toPublicViewPayload } from "../public-view-helpers.js";
import { getStoredPublicView, saveStoredPublicView } from "../public-view-store.js";
import { emitToQuizDashboard } from "../quiz-rooms.js";
import { getQuizPublicState } from "../../quiz-service.js";

const stepSchema = z.object({
  id: z.string().trim().min(1).max(80),
  mode: z.enum([
    "title",
    "question",
    "leaderboard",
    "speaker_questions",
    "reactions",
    "randomizer",
    "photo_wall",
    "video_wall",
    "debate_compare",
    "debate_series",
  ]),
  questionId: z.string().trim().min(1).max(80).optional(),
  debateCompareQuestionId: z.string().trim().min(1).max(80).optional(),
  debateSeriesId: z.string().trim().min(1).max(80).optional(),
  leaderboardSubQuizId: z.string().trim().min(1).max(80).optional(),
  durationSec: z.number().int().min(3).max(600),
});

const setStepsSchema = z.object({
  quizId: z.string().min(1),
  steps: z.array(stepSchema).max(100),
  enabled: z.boolean().optional(),
});

const quizIdSchema = z.object({
  quizId: z.string().min(1),
});

async function broadcastView(
  io: Server,
  quizId: string,
  view: Awaited<ReturnType<typeof getStoredPublicView>>,
) {
  const quiz = await getQuizPublicState(quizId);
  if (!quiz) return;
  emitToQuizDashboard(io, quizId, "results:public:view", toPublicViewPayload(view, quiz.title));
}

export function registerProjectorTimelineHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("admin:projector-timeline:set-steps", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = setStepsSchema.parse(raw);
      const view = await getStoredPublicView(payload.quizId);
      const prev = normalizeProjectorTimelineState(view.projectorTimeline);
      const nextTimeline: ProjectorTimelineState = normalizeProjectorTimelineState({
        ...prev,
        steps: payload.steps as ProjectorTimelineStep[],
        enabled: payload.enabled ?? (payload.steps.length > 0 ? true : prev.enabled),
        cursor: Math.min(prev.cursor, Math.max(0, payload.steps.length - 1)),
        playing: prev.playing && payload.steps.length > 0,
      });
      const next = { ...view, projectorTimeline: nextTimeline };
      await saveStoredPublicView(payload.quizId, next);
      if (!nextTimeline.playing) await markTimelineInactive(payload.quizId);
      await broadcastView(io, payload.quizId, next);
      socket.emit("admin:projector-timeline:updated", {
        quizId: payload.quizId,
        projectorTimeline: nextTimeline,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set timeline steps failed");
    }
  });

  socket.on("admin:projector-timeline:play", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId } = quizIdSchema.parse(raw);
      const view = await getStoredPublicView(quizId);
      const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
      if (timeline.steps.length === 0) {
        throw new Error("Timeline has no steps");
      }
      const nextTimeline: ProjectorTimelineState = {
        ...timeline,
        enabled: true,
        playing: true,
        stepStartedAt: Date.now(),
      };
      await applyTimelineStepAndBroadcast(io, quizId, view, nextTimeline);
      await markTimelineActive(quizId);
      socket.emit("admin:projector-timeline:updated", {
        quizId,
        projectorTimeline: nextTimeline,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline play failed");
    }
  });

  socket.on("admin:projector-timeline:pause", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId } = quizIdSchema.parse(raw);
      const view = await getStoredPublicView(quizId);
      const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
      const nextTimeline: ProjectorTimelineState = {
        ...timeline,
        playing: false,
        stepStartedAt: null,
      };
      const next = { ...view, projectorTimeline: nextTimeline };
      await saveStoredPublicView(quizId, next);
      await markTimelineInactive(quizId);
      await broadcastView(io, quizId, next);
      socket.emit("admin:projector-timeline:updated", {
        quizId,
        projectorTimeline: nextTimeline,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline pause failed");
    }
  });

  socket.on("admin:projector-timeline:skip", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId } = quizIdSchema.parse(raw);
      const view = await getStoredPublicView(quizId);
      const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
      if (timeline.steps.length === 0) throw new Error("Timeline has no steps");
      const nextCursor = (timeline.cursor + 1) % timeline.steps.length;
      const nextTimeline: ProjectorTimelineState = {
        ...timeline,
        enabled: true,
        playing: true,
        cursor: nextCursor,
        stepStartedAt: Date.now(),
      };
      await applyTimelineStepAndBroadcast(io, quizId, view, nextTimeline);
      socket.emit("admin:projector-timeline:updated", {
        quizId,
        projectorTimeline: nextTimeline,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline skip failed");
    }
  });

  socket.on("admin:projector-timeline:stop", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId } = quizIdSchema.parse(raw);
      const view = await getStoredPublicView(quizId);
      const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
      const nextTimeline: ProjectorTimelineState = {
        ...timeline,
        playing: false,
        cursor: 0,
        stepStartedAt: null,
      };
      const next = {
        ...view,
        mode: "title" as const,
        projectorTimeline: nextTimeline,
      };
      await saveStoredPublicView(quizId, next);
      await markTimelineInactive(quizId);
      await broadcastView(io, quizId, next);
      socket.emit("admin:projector-timeline:updated", {
        quizId,
        projectorTimeline: nextTimeline,
      });
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline stop failed");
    }
  });
}
