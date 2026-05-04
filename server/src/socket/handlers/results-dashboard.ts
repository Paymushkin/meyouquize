import type { Server } from "socket.io";
import { mergePublicViewState, type PublicViewPatch } from "@meyouquize/shared";
import { setPublicViewSchema, subscribeResultsSchema } from "../../schemas.js";
import { getDashboardResults, getQuizBySlug, getQuizPublicState } from "../../quiz-service.js";
import { prisma } from "../../prisma.js";
import { getStoredPublicView, saveStoredPublicView } from "../public-view-store.js";
import {
  emitQuizOnlineCount,
  emitToQuizDashboard,
  emitToQuizPlayersAndDashboard,
  quizDashboardRoom,
} from "../quiz-rooms.js";
import type { EnrichedSocket } from "../handler-common.js";
import { assertAdmin, fail } from "../handler-common.js";
import { toPublicViewPayload } from "../public-view-helpers.js";

export function registerResultsDashboardHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("results:subscribe", async (raw: unknown) => {
    try {
      const payload = subscribeResultsSchema.parse(raw);
      const viewer = payload.viewer ?? "projector";
      if (viewer === "admin") {
        await assertAdmin(socket);
      }
      const quiz = await getQuizBySlug(payload.slug);
      if (!quiz) throw new Error("Quiz not found");
      await socket.join(quizDashboardRoom(quiz.id));
      socket.data.quizId = quiz.id;
      const results = await getDashboardResults(quiz.id);
      const view = await getStoredPublicView(quiz.id);
      const quizState = await getQuizPublicState(quiz.id);
      socket.emit("results:dashboard", results);
      socket.emit("results:public:view", toPublicViewPayload(view, quiz.title));
      socket.emit("state:quiz", quizState);
      emitQuizOnlineCount(io, quiz.id);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Subscribe failed");
    }
  });

  socket.on("admin:results:view:set", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = setPublicViewSchema.parse(raw);
      const quiz = await getQuizPublicState(payload.quizId);
      if (!quiz) throw new Error("Quiz not found");
      const prevView = await getStoredPublicView(payload.quizId);
      const nextView = {
        ...mergePublicViewState(prevView, payload as PublicViewPatch),
        ...(typeof payload.speakerTileVisible === "boolean"
          ? { speakerTileVisible: payload.speakerTileVisible }
          : {}),
        ...(typeof payload.programTileText === "string"
          ? { programTileText: payload.programTileText }
          : {}),
        ...(typeof payload.programTileBackgroundColor === "string"
          ? { programTileBackgroundColor: payload.programTileBackgroundColor }
          : {}),
        ...(typeof payload.programTileLinkUrl === "string"
          ? { programTileLinkUrl: payload.programTileLinkUrl }
          : {}),
        ...(typeof payload.programTileVisible === "boolean"
          ? { programTileVisible: payload.programTileVisible }
          : {}),
      };
      if (nextView.mode !== "speaker_questions") {
        await prisma.speakerQuestion.updateMany({
          where: { quizId: payload.quizId, isOnScreen: true },
          data: { isOnScreen: false },
        });
      }
      await saveStoredPublicView(payload.quizId, nextView);
      console.info("[mq-winners] admin:results:view:set merged", {
        quizId: payload.quizId,
        mode: nextView.mode,
        questionId: nextView.questionId,
        showFirstCorrectAnswerer: nextView.showFirstCorrectAnswerer,
      });
      emitToQuizDashboard(
        io,
        payload.quizId,
        "results:public:view",
        toPublicViewPayload(nextView, quiz.title),
      );
      const updatedQuizState = await getQuizPublicState(payload.quizId);
      emitToQuizPlayersAndDashboard(io, payload.quizId, "state:quiz", updatedQuizState);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Set public view failed");
    }
  });
}
