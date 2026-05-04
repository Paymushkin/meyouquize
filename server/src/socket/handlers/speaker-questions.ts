import type { Server } from "socket.io";
import { SpeakerQuestionStatus } from "@prisma/client";
import { mergePublicViewState } from "@meyouquize/shared";
import {
  adminSpeakerQuestionDeleteSchema,
  adminSpeakerSettingsSchema,
  adminSpeakerQuestionScreenSchema,
  adminSpeakerQuestionUpdateSchema,
  adminSpeakerQuestionUserVisibleSchema,
  adminSpeakerQuestionStatusSchema,
  createSpeakerQuestionSchema,
  speakerQuestionReactSchema,
  subscribeSpeakerQuestionsSchema,
} from "../../schemas.js";
import { prisma } from "../../prisma.js";
import { containsProfanity } from "../../profanity.js";
import { getQuizBySlug } from "../../quiz-service.js";
import type { EnrichedSocket } from "../handler-common.js";
import { assertAdmin, fail } from "../handler-common.js";
import { getStoredPublicView } from "../public-view-store.js";
import { saveStoredPublicView } from "../public-view-store.js";
import { toPublicViewPayload } from "../public-view-helpers.js";
import {
  emitToQuizDashboard,
  emitToQuizPlayers,
  quizDashboardRoom,
  quizPlayerRoom,
} from "../quiz-rooms.js";

type SpeakerQuestionWire = {
  id: string;
  speakerName: string;
  text: string;
  authorNickname: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userVisible: boolean;
  isOnScreen: boolean;
  reactionCounts: Record<string, number>;
  myReactions: string[];
  createdAt: string;
};

type ViewerMode = "player" | "projector" | "admin";

async function buildSpeakerQuestionsPayload(
  quizId: string,
  participantId?: string | null,
  viewMode: ViewerMode = "player",
) {
  const view = await getStoredPublicView(quizId);
  const availableReactions =
    Array.isArray(view.speakerQuestionsReactions) && view.speakerQuestionsReactions.length > 0
      ? view.speakerQuestionsReactions
      : ["👍", "🔥", "👏", "❤️"];
  const [rows, reactions, myReactionRows] = await Promise.all([
    prisma.speakerQuestion.findMany({
      where: { quizId },
      orderBy: [{ isOnScreen: "desc" }, { createdAt: "desc" }],
      include: {
        participant: { select: { nickname: true } },
        _count: {
          select: { reactions: true },
        },
      },
    }),
    prisma.speakerQuestionReaction.findMany({
      where: { speakerQuestion: { quizId } },
      select: { speakerQuestionId: true, reaction: true },
    }),
    participantId
      ? prisma.speakerQuestionReaction.findMany({
          where: { participantId, speakerQuestion: { quizId } },
          select: { speakerQuestionId: true, reaction: true },
        })
      : Promise.resolve([]),
  ]);
  const reactionCountsByQuestion = new Map<string, Record<string, number>>();
  for (const row of reactions) {
    const prev = reactionCountsByQuestion.get(row.speakerQuestionId) ?? {};
    prev[row.reaction] = (prev[row.reaction] ?? 0) + 1;
    reactionCountsByQuestion.set(row.speakerQuestionId, prev);
  }
  const myReactionsByQuestion = new Map<string, string[]>();
  for (const row of myReactionRows) {
    const prev = myReactionsByQuestion.get(row.speakerQuestionId) ?? [];
    if (!prev.includes(row.reaction)) prev.push(row.reaction);
    myReactionsByQuestion.set(row.speakerQuestionId, prev);
  }
  const adminView = viewMode === "admin";
  const projectorView = viewMode === "projector";
  const items: SpeakerQuestionWire[] = rows
    .filter(
      (row) =>
        adminView ||
        (projectorView && row.isOnScreen) ||
        row.isVisibleToUsers ||
        (participantId != null && row.participantId === participantId),
    )
    .map((row) => ({
      id: row.id,
      speakerName: row.speakerName,
      text: row.text,
      authorNickname: row.participant.nickname,
      status: row.status,
      userVisible: row.isVisibleToUsers,
      isOnScreen: row.isOnScreen,
      reactionCounts: reactionCountsByQuestion.get(row.id) ?? {},
      myReactions: myReactionsByQuestion.get(row.id) ?? [],
      createdAt: row.createdAt.toISOString(),
    }));
  return {
    settings: {
      enabled: view.speakerQuestionsEnabled,
      speakers: view.speakerQuestionsSpeakers,
      reactions: availableReactions,
      showAuthorOnScreen: view.speakerQuestionsShowAuthorOnScreen,
      showRecipientOnScreen: view.speakerQuestionsShowRecipientOnScreen,
      showReactionsOnScreen: view.speakerQuestionsShowReactionsOnScreen,
    },
    items,
  };
}

async function broadcastSpeakerQuestions(io: Server, quizId: string, excludeSocketId?: string) {
  const playerSockets = await io.in(quizPlayerRoom(quizId)).fetchSockets();
  const dashboardSockets = await io.in(quizDashboardRoom(quizId)).fetchSockets();

  const payloadCache = new Map<string, Awaited<ReturnType<typeof buildSpeakerQuestionsPayload>>>();
  const getPayload = async (participantId: string | null | undefined, mode: ViewerMode) => {
    const key = `${mode}:${participantId ?? "_"}`;
    const cached = payloadCache.get(key);
    if (cached) return cached;
    const built = await buildSpeakerQuestionsPayload(quizId, participantId ?? null, mode);
    payloadCache.set(key, built);
    return built;
  };

  for (const s of playerSockets) {
    if (excludeSocketId && s.id === excludeSocketId) continue;
    const mode: ViewerMode = s.data.isAdmin
      ? "admin"
      : s.data.speakerViewer === "projector"
        ? "projector"
        : "player";
    const payload = await getPayload(s.data.participantId ?? null, mode);
    s.emit("speaker:questions:update", payload);
  }
  for (const s of dashboardSockets) {
    if (excludeSocketId && s.id === excludeSocketId) continue;
    const mode: ViewerMode = s.data.isAdmin
      ? "admin"
      : s.data.speakerViewer === "projector"
        ? "projector"
        : "player";
    const payload = await getPayload(s.data.participantId ?? null, mode);
    s.emit("speaker:questions:update", payload);
  }
}

function resolveViewerMode(socket: EnrichedSocket, rawViewer?: ViewerMode): ViewerMode {
  if (socket.data.isAdmin) return "admin";
  return rawViewer === "projector" ? "projector" : "player";
}

async function ensureQuestionInQuiz(questionId: string, quizId: string) {
  const question = await prisma.speakerQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, quizId: true },
  });
  if (!question || question.quizId !== quizId) throw new Error("Question not found");
}

export function registerSpeakerQuestionsHandlers(socket: EnrichedSocket, io: Server) {
  socket.on("speaker:questions:subscribe", async (raw: unknown) => {
    try {
      const payload = subscribeSpeakerQuestionsSchema.parse(raw);
      const quiz = await getQuizBySlug(payload.slug);
      if (!quiz) throw new Error("Quiz not found");
      const viewer = resolveViewerMode(socket, payload.viewer);
      socket.data.speakerViewer = viewer;
      await socket.join(quizPlayerRoom(quiz.id));
      if (socket.data.isAdmin || viewer === "projector") {
        await socket.join(quizDashboardRoom(quiz.id));
      }
      const result = await buildSpeakerQuestionsPayload(quiz.id, socket.data.participantId, viewer);
      socket.emit("speaker:questions:update", result);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Subscribe speaker questions failed");
    }
  });

  socket.on("admin:speaker:settings:set", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerSettingsSchema.parse(raw);
      const prev = await getStoredPublicView(payload.quizId);
      const next = mergePublicViewState(prev, {
        speakerQuestionsEnabled: payload.enabled,
        speakerQuestionsSpeakers: payload.speakers,
        speakerQuestionsReactions: payload.reactions,
        speakerQuestionsShowAuthorOnScreen: payload.showAuthorOnScreen,
        ...(payload.showRecipientOnScreen !== undefined
          ? { speakerQuestionsShowRecipientOnScreen: payload.showRecipientOnScreen }
          : {}),
        ...(payload.showReactionsOnScreen !== undefined
          ? { speakerQuestionsShowReactionsOnScreen: payload.showReactionsOnScreen }
          : {}),
      });
      await saveStoredPublicView(payload.quizId, next);
      const quiz = await prisma.quiz.findUnique({
        where: { id: payload.quizId },
        select: { title: true },
      });
      emitToQuizDashboard(
        io,
        payload.quizId,
        "results:public:view",
        toPublicViewPayload(next, quiz?.title ?? "Квиз"),
      );
      await broadcastSpeakerQuestions(io, payload.quizId, socket.id);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Update speaker settings failed");
    }
  });

  socket.on("speaker:question:create", async (raw: unknown) => {
    try {
      const payload = createSpeakerQuestionSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      const view = await getStoredPublicView(payload.quizId);
      if (!view.speakerQuestionsEnabled) throw new Error("Функция выключена администратором");
      if (
        payload.speakerName !== "Все спикеры" &&
        view.speakerQuestionsSpeakers.length > 0 &&
        !view.speakerQuestionsSpeakers.includes(payload.speakerName)
      ) {
        throw new Error("Спикер не найден");
      }
      if (containsProfanity(payload.text)) throw new Error("Вопрос содержит недопустимые слова");
      await prisma.speakerQuestion.create({
        data: {
          quizId: payload.quizId,
          participantId: socket.data.participantId,
          speakerName: payload.speakerName,
          text: payload.text,
          isVisibleToUsers: false,
          status: SpeakerQuestionStatus.PENDING,
        },
      });
      const result = await buildSpeakerQuestionsPayload(
        payload.quizId,
        socket.data.participantId,
        "player",
      );
      socket.emit("speaker:questions:update", result);
      await broadcastSpeakerQuestions(io, payload.quizId, socket.id);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Create speaker question failed");
    }
  });

  socket.on("speaker:question:react", async (raw: unknown) => {
    try {
      const payload = speakerQuestionReactSchema.parse(raw);
      if (!socket.data.participantId) throw new Error("Not joined");
      const view = await getStoredPublicView(payload.quizId);
      const allowedReactions =
        Array.isArray(view.speakerQuestionsReactions) && view.speakerQuestionsReactions.length > 0
          ? view.speakerQuestionsReactions
          : ["👍", "🔥", "👏", "❤️"];
      if (!allowedReactions.includes(payload.reaction))
        throw new Error("Реакция не поддерживается");
      await ensureQuestionInQuiz(payload.speakerQuestionId, payload.quizId);
      const existing = await prisma.speakerQuestionReaction.findFirst({
        where: {
          speakerQuestionId: payload.speakerQuestionId,
          participantId: socket.data.participantId,
          reaction: payload.reaction,
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.speakerQuestionReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.speakerQuestionReaction.create({
          data: {
            speakerQuestionId: payload.speakerQuestionId,
            participantId: socket.data.participantId,
            reaction: payload.reaction,
          },
        });
      }
      const result = await buildSpeakerQuestionsPayload(
        payload.quizId,
        socket.data.participantId,
        "player",
      );
      socket.emit("speaker:questions:update", result);
      await broadcastSpeakerQuestions(io, payload.quizId, socket.id);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "React speaker question failed");
    }
  });

  socket.on("admin:speaker:question:status", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerQuestionStatusSchema.parse(raw);
      await prisma.speakerQuestion.update({
        where: { id: payload.speakerQuestionId },
        data: { status: payload.status as SpeakerQuestionStatus },
      });
      await broadcastSpeakerQuestions(io, payload.quizId);
    } catch (error) {
      fail(
        socket,
        error instanceof Error ? error.message : "Update speaker question status failed",
      );
    }
  });

  socket.on("admin:speaker:question:screen", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerQuestionScreenSchema.parse(raw);
      await ensureQuestionInQuiz(payload.speakerQuestionId, payload.quizId);
      await prisma.speakerQuestion.update({
        where: { id: payload.speakerQuestionId },
        data: { isOnScreen: payload.isOnScreen },
      });
      await broadcastSpeakerQuestions(io, payload.quizId);
    } catch (error) {
      fail(
        socket,
        error instanceof Error ? error.message : "Update speaker question on-screen failed",
      );
    }
  });

  socket.on("admin:speaker:question:user-visible", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerQuestionUserVisibleSchema.parse(raw);
      await prisma.speakerQuestion.update({
        where: { id: payload.speakerQuestionId },
        data: { isVisibleToUsers: payload.isVisibleToUsers },
      });
      await broadcastSpeakerQuestions(io, payload.quizId);
    } catch (error) {
      fail(
        socket,
        error instanceof Error ? error.message : "Update speaker question user visibility failed",
      );
    }
  });

  socket.on("admin:speaker:question:update", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerQuestionUpdateSchema.parse(raw);
      await prisma.speakerQuestion.update({
        where: { id: payload.speakerQuestionId },
        data: { text: payload.text },
      });
      await broadcastSpeakerQuestions(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Update speaker question failed");
    }
  });

  socket.on("admin:speaker:question:delete", async (raw: unknown) => {
    try {
      await assertAdmin(socket);
      const payload = adminSpeakerQuestionDeleteSchema.parse(raw);
      await ensureQuestionInQuiz(payload.speakerQuestionId, payload.quizId);
      await prisma.$transaction(async (tx) => {
        await tx.speakerQuestionReaction.deleteMany({
          where: { speakerQuestionId: payload.speakerQuestionId },
        });
        await tx.speakerQuestion.delete({
          where: { id: payload.speakerQuestionId },
        });
      });
      await broadcastSpeakerQuestions(io, payload.quizId);
    } catch (error) {
      fail(socket, error instanceof Error ? error.message : "Delete speaker question failed");
    }
  });
}
