import type { EventThemeBranding } from "@meyouquize/shared";
import { normalizeEventThemeBranding } from "@meyouquize/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type EventThemeListItem = {
  id: string;
  name: string;
  updatedAt: string;
};

export type EventThemeRecord = EventThemeListItem & {
  branding: EventThemeBranding;
  createdAt: string;
};

function toListItem(row: { id: string; name: string; updatedAt: Date }): EventThemeListItem {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRecord(row: {
  id: string;
  name: string;
  branding: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): EventThemeRecord {
  return {
    ...toListItem(row),
    createdAt: row.createdAt.toISOString(),
    branding: normalizeEventThemeBranding(row.branding),
  };
}

export async function listEventThemes(): Promise<EventThemeListItem[]> {
  const rows = await prisma.eventTheme.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, updatedAt: true },
  });
  return rows.map(toListItem);
}

export async function getEventThemeById(id: string): Promise<EventThemeRecord | null> {
  const row = await prisma.eventTheme.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
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
  return toRecord(row);
}

export async function updateEventTheme(
  id: string,
  input: { name?: string; branding?: unknown },
): Promise<EventThemeRecord | null> {
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
  return toRecord(row);
}

export async function deleteEventTheme(id: string): Promise<boolean> {
  try {
    await prisma.eventTheme.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
