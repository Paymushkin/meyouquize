import { Prisma } from "@prisma/client";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  normalizePublicViewState,
  type PublicViewState,
} from "@meyouquize/shared";
import { prisma } from "../prisma.js";

type ProgramTileExtras = {
  speakerTileVisible?: boolean;
  speakerTileTextColor?: string;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileTextColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
};

function extractProgramTileExtras(value: unknown): ProgramTileExtras {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    speakerTileVisible:
      typeof row.speakerTileVisible === "boolean" ? row.speakerTileVisible : undefined,
    speakerTileTextColor:
      typeof row.speakerTileTextColor === "string" ? row.speakerTileTextColor : undefined,
    programTileText: typeof row.programTileText === "string" ? row.programTileText : undefined,
    programTileBackgroundColor:
      typeof row.programTileBackgroundColor === "string"
        ? row.programTileBackgroundColor
        : undefined,
    programTileTextColor:
      typeof row.programTileTextColor === "string" ? row.programTileTextColor : undefined,
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
      ...(extras.speakerTileTextColor !== undefined
        ? { speakerTileTextColor: extras.speakerTileTextColor }
        : {}),
      ...(extras.programTileText !== undefined ? { programTileText: extras.programTileText } : {}),
      ...(extras.programTileBackgroundColor !== undefined
        ? { programTileBackgroundColor: extras.programTileBackgroundColor }
        : {}),
      ...(extras.programTileTextColor !== undefined
        ? { programTileTextColor: extras.programTileTextColor }
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
    ...(extras.speakerTileTextColor !== undefined
      ? { speakerTileTextColor: extras.speakerTileTextColor }
      : {}),
    ...(extras.programTileText !== undefined ? { programTileText: extras.programTileText } : {}),
    ...(extras.programTileBackgroundColor !== undefined
      ? { programTileBackgroundColor: extras.programTileBackgroundColor }
      : {}),
    ...(extras.programTileTextColor !== undefined
      ? { programTileTextColor: extras.programTileTextColor }
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
