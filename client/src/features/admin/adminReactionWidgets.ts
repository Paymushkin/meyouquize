import type { ReactionWidget } from "../../components/admin/AdminReactionsSection";
import type { PublicReactionWidgetStats } from "../../publicViewContract";

export function parseReactionLines(text: string): string[] {
  const deduped: string[] = [];
  for (const line of text.split("\n")) {
    const value = line.trim();
    if (!value) continue;
    if (!deduped.includes(value)) deduped.push(value);
  }
  return deduped;
}

export function getReactionWidgetsOrNull(value: unknown): ReactionWidget[] | null {
  if (!Array.isArray(value)) return null;
  const widgets: ReactionWidget[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; title?: unknown; reactions?: unknown };
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    const reactions = Array.isArray(row.reactions)
      ? row.reactions
          .filter((reaction): reaction is string => typeof reaction === "string")
          .map((reaction) => reaction.trim())
          .filter((reaction) => reaction.length > 0)
      : [];
    if (reactions.length === 0) continue;
    widgets.push({
      id: row.id.trim(),
      title: typeof row.title === "string" ? row.title : "",
      reactions,
    });
  }
  return widgets;
}

export function getReactionWidgetStatsOrNull(value: unknown): PublicReactionWidgetStats[] | null {
  if (!Array.isArray(value)) return null;
  const result: PublicReactionWidgetStats[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { widgetId?: unknown; counts?: unknown };
    if (typeof row.widgetId !== "string" || !row.widgetId.trim()) continue;
    if (!row.counts || typeof row.counts !== "object" || Array.isArray(row.counts)) continue;
    const counts: Record<string, number> = {};
    for (const [reaction, rawCount] of Object.entries(row.counts as Record<string, unknown>)) {
      if (typeof reaction !== "string" || !reaction.trim()) continue;
      const count = Number(rawCount);
      counts[reaction.trim()] = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
    }
    result.push({ widgetId: row.widgetId.trim(), counts });
  }
  return result;
}

export function readReactionWidgetsFromStorage(storageKey: string): ReactionWidget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return getReactionWidgetsOrNull(parsed) ?? [];
  } catch {
    return [];
  }
}

export function readReactionsOverlayTextFromStorage(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const value = raw.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}
