import type { PublicViewState } from "@meyouquize/shared";
import { getStoredPublicView, saveStoredPublicView } from "./socket/public-view-store.js";

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== b.length) return false;
  return b.every((item) => setA.has(item));
}

function findReactionWidget(view: PublicViewState, sessionReactions: string[], widgetId?: string) {
  if (widgetId) {
    return view.reactionsWidgets.find((widget) => widget.id === widgetId);
  }
  const overlayText = view.reactionsOverlayText.trim();
  const activeByOverlay = view.reactionsWidgets.find(
    (widget) => widget.title.trim() === overlayText,
  );
  const activeByReactions = view.reactionsWidgets.find((widget) =>
    arraysEqualAsSets(widget.reactions, sessionReactions),
  );
  return activeByOverlay ?? activeByReactions;
}

function normalizeWidgetCounts(
  reactions: string[],
  counts: Record<string, number>,
): Record<string, number> {
  return reactions.reduce<Record<string, number>>((acc, reaction) => {
    const value = counts[reaction] ?? 0;
    acc[reaction] = Math.max(0, Math.trunc(value));
    return acc;
  }, {});
}

/** Seed live session from persisted widget totals (do not wipe on phones start). */
export async function readReactionWidgetSeedCounts(
  quizId: string,
  sessionReactions: string[],
): Promise<Record<string, number> | undefined> {
  const view = await getStoredPublicView(quizId);
  if (view.reactionsWidgets.length === 0) return undefined;
  const targetWidget = findReactionWidget(view, sessionReactions);
  if (!targetWidget) return undefined;
  const row = view.reactionsWidgetStats.find((item) => item.widgetId === targetWidget.id);
  if (!row) return undefined;
  return normalizeWidgetCounts(targetWidget.reactions, row.counts);
}

export async function persistReactionWidgetCounts(
  quizId: string,
  sessionReactions: string[],
  counts: Record<string, number>,
) {
  const view = await getStoredPublicView(quizId);
  if (view.reactionsWidgets.length === 0) return;
  const targetWidget = findReactionWidget(view, sessionReactions);
  if (!targetWidget) return;

  const normalizedCounts = normalizeWidgetCounts(targetWidget.reactions, counts);

  const nextStats = [
    ...view.reactionsWidgetStats.filter((item) => item.widgetId !== targetWidget.id),
    { widgetId: targetWidget.id, counts: normalizedCounts },
  ];
  await saveStoredPublicView(quizId, { ...view, reactionsWidgetStats: nextStats });
}

export async function clearReactionWidgetCounts(quizId: string, widgetId: string) {
  const view = await getStoredPublicView(quizId);
  const targetWidget = view.reactionsWidgets.find((widget) => widget.id === widgetId);
  if (!targetWidget) return null;

  const zeroCounts = normalizeWidgetCounts(targetWidget.reactions, {});
  const nextStats = [
    ...view.reactionsWidgetStats.filter((item) => item.widgetId !== widgetId),
    { widgetId, counts: zeroCounts },
  ];
  await saveStoredPublicView(quizId, { ...view, reactionsWidgetStats: nextStats });
  return { widget: targetWidget, counts: zeroCounts };
}
