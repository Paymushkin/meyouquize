import { Prisma } from "@prisma/client";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  normalizePublicViewState,
  type PublicViewState,
} from "@meyouquize/shared";
import { prisma } from "../prisma.js";

export function publicViewJsonToState(value: Prisma.JsonValue | null): PublicViewState {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return normalizePublicViewState(value as Partial<PublicViewState>);
  }
  return normalizePublicViewState(DEFAULT_PUBLIC_VIEW_STATE);
}

export async function getStoredPublicView(quizId: string): Promise<PublicViewState> {
  const row = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { publicView: true },
  });
  return publicViewJsonToState(row?.publicView ?? null);
}

export async function saveStoredPublicView(quizId: string, view: PublicViewState) {
  const normalized = normalizePublicViewState(view);
  await prisma.quiz.update({
    where: { id: quizId },
    data: { publicView: normalized as unknown as Prisma.InputJsonValue },
  });
}
