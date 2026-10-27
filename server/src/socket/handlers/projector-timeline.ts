import {
  isProjectorTimelineAdvancing,
  normalizeProjectorTimelineState,
  type ProjectorTimelineState,
  type ProjectorTimelineStep,
} from "@meyouquize/shared";
import type { Server } from "socket.io";
import { z } from "zod";
import {
  applyTimelineStepAndBroadcast,
  freezeTimelineStep,
  markTimelineActive,
  unfreezeTimeline,
} from "../../projector-timeline-sequencer.js";
import { assertAdmin, fail, type EnrichedSocket } from "../handler-common.js";
import { getStoredPublicView } from "../public-view-store.js";

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
    "networking_profiles",
    "networking_stats",
    "networking_incomplete",
    "join_qr",
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

const freezeSchema = z.object({
  quizId: z.string().min(1),
  stepIndex: z.number().int().min(0).max(99),
});

function emitTimelineUpdated(
  socket: EnrichedSocket,
  quizId: string,
  projectorTimeline: ProjectorTimelineState,
) {
  socket.emit("admin:projector-timeline:updated", {
    quizId,
    projectorTimeline,
  });
}

export function registerProjectorTimelineHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("admin:projector-timeline:set-steps", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = setStepsSchema.parse(raw);
      const view = await getStoredPublicView(payload.quizId);
      const prev = normalizeProjectorTimelineState(view.projectorTimeline);
      const steps = payload.steps as ProjectorTimelineStep[];
      const nextTimeline: ProjectorTimelineState = normalizeProjectorTimelineState({
        ...prev,
        steps,
        enabled: payload.enabled ?? true,
        cursor: Math.min(prev.cursor, Math.max(0, Math.max(steps.length, 1) - 1)),
        frozen: prev.frozen,
        // Редактирование плейлиста снимает override и сразу показывает текущий шаг.
        suppressed: false,
        stepStartedAt: Date.now(),
      });
      nextTimeline.playing = isProjectorTimelineAdvancing(nextTimeline);

      // normalize всегда оставляет ≥1 шаг (дефолтный QR); таймлайн active без Play.
      const applied = await applyTimelineStepAndBroadcast(io, payload.quizId, view, nextTimeline);
      await markTimelineActive(payload.quizId);
      emitTimelineUpdated(
        socket,
        payload.quizId,
        normalizeProjectorTimelineState(applied.projectorTimeline),
      );
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set timeline steps failed");
    }
  });

  socket.on("admin:projector-timeline:freeze", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId, stepIndex } = freezeSchema.parse(raw);
      const view = await getStoredPublicView(quizId);
      const timeline = normalizeProjectorTimelineState(view.projectorTimeline);
      // Повторный freeze на том же шаге → unfreeze.
      if (timeline.frozen && timeline.cursor === stepIndex) {
        const next = await unfreezeTimeline(io, quizId);
        emitTimelineUpdated(
          socket,
          quizId,
          normalizeProjectorTimelineState(next.projectorTimeline),
        );
        return;
      }
      const next = await freezeTimelineStep(io, quizId, stepIndex);
      emitTimelineUpdated(socket, quizId, normalizeProjectorTimelineState(next.projectorTimeline));
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline freeze failed");
    }
  });

  socket.on("admin:projector-timeline:unfreeze", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const { quizId } = quizIdSchema.parse(raw);
      const next = await unfreezeTimeline(io, quizId);
      emitTimelineUpdated(socket, quizId, normalizeProjectorTimelineState(next.projectorTimeline));
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Timeline unfreeze failed");
    }
  });
}
