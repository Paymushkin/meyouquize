import type { Server } from "socket.io";
import { prisma } from "./prisma.js";
import { toPublicViewPayload } from "./socket/public-view-helpers.js";
import { getStoredPublicView, saveStoredPublicView } from "./socket/public-view-store.js";
import { emitToQuizDashboard } from "./socket/quiz-rooms.js";

export async function persistBannerUniqueClick(
  quizId: string,
  bannerId: string,
  participantId: string,
): Promise<boolean> {
  const view = await getStoredPublicView(quizId);
  const banner = view.playerBanners.find((item) => item.id === bannerId);
  if (!banner?.isVisible) return false;

  const existing = view.playerBannerClickParticipantIds[bannerId] ?? [];
  if (existing.includes(participantId)) return false;

  const nextParticipants = [...existing, participantId];
  const nextStats = [
    ...view.playerBannerClickStats.filter((item) => item.bannerId !== bannerId),
    { bannerId, uniqueClicks: nextParticipants.length },
  ];
  await saveStoredPublicView(quizId, {
    ...view,
    playerBannerClickStats: nextStats,
    playerBannerClickParticipantIds: {
      ...view.playerBannerClickParticipantIds,
      [bannerId]: nextParticipants,
    },
  });
  return true;
}

export async function broadcastPublicViewToDashboard(io: Server, quizId: string) {
  const [view, row] = await Promise.all([
    getStoredPublicView(quizId),
    prisma.quiz.findUnique({ where: { id: quizId }, select: { title: true } }),
  ]);
  if (!row) return;
  emitToQuizDashboard(io, quizId, "results:public:view", toPublicViewPayload(view, row.title));
}
