import { getStoredPublicView, saveStoredPublicView } from "./socket/public-view-store.js";

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== b.length) return false;
  return b.every((item) => setA.has(item));
}

export async function persistReactionWidgetCounts(
  quizId: string,
  sessionReactions: string[],
  counts: Record<string, number>,
) {
  const view = await getStoredPublicView(quizId);
  if (view.reactionsWidgets.length === 0) return;
  const overlayText = view.reactionsOverlayText.trim();
  const activeByOverlay = view.reactionsWidgets.find(
    (widget) => widget.title.trim() === overlayText,
  );
  const activeByReactions = view.reactionsWidgets.find((widget) =>
    arraysEqualAsSets(widget.reactions, sessionReactions),
  );
  const targetWidget = activeByOverlay ?? activeByReactions;
  if (!targetWidget) return;

  const normalizedCounts = targetWidget.reactions.reduce<Record<string, number>>(
    (acc, reaction) => {
      const value = counts[reaction] ?? 0;
      acc[reaction] = Math.max(0, Math.trunc(value));
      return acc;
    },
    {},
  );

  const nextStats = [
    ...view.reactionsWidgetStats.filter((item) => item.widgetId !== targetWidget.id),
    { widgetId: targetWidget.id, counts: normalizedCounts },
  ];
  await saveStoredPublicView(quizId, { ...view, reactionsWidgetStats: nextStats });
}
