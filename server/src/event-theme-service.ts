import type { EventThemeBranding } from "@meyouquize/shared";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  getBrandThemeVisualPatch,
  isSystemEventThemeId,
  normalizeEventThemeBranding,
  pickEventThemeBrandingFromPublicView,
  SYSTEM_EVENT_THEME_IDS,
  systemEventThemeDisplayName,
  systemEventThemeStorageName,
  type SystemEventThemeId,
} from "@meyouquize/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type EventThemeListItem = {
  id: string;
  name: string;
  updatedAt: string | null;
  system: boolean;
};

export type EventThemeRecord = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  branding: EventThemeBranding;
  system: boolean;
};

function buildBuiltinEventThemeBranding(themeId: SystemEventThemeId): EventThemeBranding {
  const patch = getBrandThemeVisualPatch(themeId);
  return pickEventThemeBrandingFromPublicView({
    ...DEFAULT_PUBLIC_VIEW_STATE,
    ...patch,
    brandTheme: themeId,
  });
}

function toListItem(row: {
  id: string;
  name: string;
  updatedAt: Date;
  system: boolean;
}): EventThemeListItem {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    system: row.system,
  };
}

function toRecord(row: {
  id: string;
  name: string;
  branding: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  system: boolean;
}): EventThemeRecord {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    branding: normalizeEventThemeBranding(row.branding),
    system: row.system,
  };
}

async function getSystemThemeRow(id: SystemEventThemeId) {
  return prisma.eventTheme.findUnique({ where: { id } });
}

export async function listEventThemes(): Promise<EventThemeListItem[]> {
  const customRows = await prisma.eventTheme.findMany({
    where: { id: { notIn: [...SYSTEM_EVENT_THEME_IDS] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, updatedAt: true },
  });

  const systemItems: EventThemeListItem[] = await Promise.all(
    SYSTEM_EVENT_THEME_IDS.map(async (id) => {
      const row = await getSystemThemeRow(id);
      return {
        id,
        name: systemEventThemeDisplayName(id),
        updatedAt: row ? row.updatedAt.toISOString() : null,
        system: true,
      };
    }),
  );

  return [...systemItems, ...customRows.map((row) => toListItem({ ...row, system: false }))];
}

export async function getEventThemeById(id: string): Promise<EventThemeRecord | null> {
  if (isSystemEventThemeId(id)) {
    const base = buildBuiltinEventThemeBranding(id);
    const row = await getSystemThemeRow(id);
    if (!row) {
      const now = new Date(0).toISOString();
      return {
        id,
        name: systemEventThemeDisplayName(id),
        createdAt: now,
        updatedAt: now,
        branding: base,
        system: true,
      };
    }
    return {
      id,
      name: systemEventThemeDisplayName(id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      branding: normalizeEventThemeBranding({ ...base, ...(row.branding as object) }),
      system: true,
    };
  }

  const row = await prisma.eventTheme.findUnique({ where: { id } });
  return row ? toRecord({ ...row, system: false }) : null;
}

export async function createEventTheme(input: {
  name: string;
  branding: unknown;
}): Promise<EventThemeRecord> {
  const name = input.name.trim();
  const branding = normalizeEventThemeBranding(input.branding);
  const row = await prisma.eventTheme.create({
    data: { name, branding: branding as Prisma.InputJsonValue },
  });
  return toRecord({ ...row, system: false });
}

export async function updateEventTheme(
  id: string,
  input: { name?: string; branding?: unknown },
): Promise<EventThemeRecord | null> {
  if (isSystemEventThemeId(id)) {
    const base = buildBuiltinEventThemeBranding(id);
    const branding =
      input.branding !== undefined
        ? normalizeEventThemeBranding({ ...base, ...(input.branding as object) })
        : base;
    const row = await prisma.eventTheme.upsert({
      where: { id },
      create: {
        id,
        name: systemEventThemeStorageName(id),
        branding: branding as Prisma.InputJsonValue,
      },
      update: {
        branding: branding as Prisma.InputJsonValue,
      },
    });
    return {
      id,
      name: systemEventThemeDisplayName(id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      branding,
      system: true,
    };
  }

  const existing = await prisma.eventTheme.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Prisma.EventThemeUpdateInput = {};
  if (typeof input.name === "string") {
    data.name = input.name.trim();
  }
  if (input.branding !== undefined) {
    data.branding = normalizeEventThemeBranding(input.branding) as Prisma.InputJsonValue;
  }

  const row = await prisma.eventTheme.update({ where: { id }, data });
  return toRecord({ ...row, system: false });
}

export async function deleteEventTheme(id: string): Promise<"deleted" | "not_found" | "forbidden"> {
  if (isSystemEventThemeId(id)) return "forbidden";
  try {
    await prisma.eventTheme.delete({ where: { id } });
    return "deleted";
  } catch {
    return "not_found";
  }
}
