import { Prisma } from "@prisma/client";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  normalizePublicViewState,
  type PublicViewState,
} from "@meyouquize/shared";
import { prisma } from "../prisma.js";

type ProgramTileExtras = {
  speakerTileVisible?: boolean;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
};

function extractProgramTileExtras(value: unknown): ProgramTileExtras {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    speakerTileVisible:
      typeof row.speakerTileVisible === "boolean" ? row.speakerTileVisible : undefined,
    programTileText: typeof row.programTileText === "string" ? row.programTileText : undefined,
    programTileBackgroundColor:
      typeof row.programTileBackgroundColor === "string"
        ? row.programTileBackgroundColor
        : undefined,
    programTileLinkUrl:
      typeof row.programTileLinkUrl === "string" ? row.programTileLinkUrl : undefined,
    programTileVisible:
      typeof row.programTileVisible === "boolean" ? row.programTileVisible : undefined,
  };
}

export function publicViewJsonToState(value: Prisma.JsonValue | null): PublicViewState {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const normalized = normalizePublicViewState(value as Partial<PublicViewState>);
    const extras = extractProgramTileExtras(value);
    return {
      ...normalized,
      ...(extras.speakerTileVisible !== undefined
        ? { speakerTileVisible: extras.speakerTileVisible }
        : {}),
      ...(extras.programTileText !== undefined ? { programTileText: extras.programTileText } : {}),
      ...(extras.programTileBackgroundColor !== undefined
        ? { programTileBackgroundColor: extras.programTileBackgroundColor }
        : {}),
      ...(extras.programTileLinkUrl !== undefined
        ? { programTileLinkUrl: extras.programTileLinkUrl }
        : {}),
      ...(extras.programTileVisible !== undefined
        ? { programTileVisible: extras.programTileVisible }
        : {}),
    } as PublicViewState;
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
  const extras = extractProgramTileExtras(view);
  const toSave = {
    ...normalized,
    ...(extras.speakerTileVisible !== undefined
      ? { speakerTileVisible: extras.speakerTileVisible }
      : {}),
    ...(extras.programTileText !== undefined ? { programTileText: extras.programTileText } : {}),
    ...(extras.programTileBackgroundColor !== undefined
      ? { programTileBackgroundColor: extras.programTileBackgroundColor }
      : {}),
    ...(extras.programTileLinkUrl !== undefined
      ? { programTileLinkUrl: extras.programTileLinkUrl }
      : {}),
    ...(extras.programTileVisible !== undefined
      ? { programTileVisible: extras.programTileVisible }
      : {}),
  };
  await prisma.quiz.update({
    where: { id: quizId },
    data: { publicView: toSave as unknown as Prisma.InputJsonValue },
  });
}
