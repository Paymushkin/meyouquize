import type { PublicViewPayload } from "@meyouquize/shared";
import type { ReactionWidget } from "../../components/admin/AdminReactionsSection";
import type { PublicReactionWidgetStats } from "../../publicViewContract";
import { getReactionWidgetStatsOrNull, getReactionWidgetsOrNull } from "./adminReactionWidgets";

type Setters = {
  setOverlayText: (value: string) => void;
  setWidgets: (value: ReactionWidget[]) => void;
  setWidgetStats: (value: PublicReactionWidgetStats[]) => void;
};

export function applyAdminReactionsFromPublicView(pv: PublicViewPayload, setters: Setters) {
  if (typeof pv.reactionsOverlayText === "string") {
    setters.setOverlayText(pv.reactionsOverlayText);
  }
  const widgets = getReactionWidgetsOrNull(pv.reactionsWidgets);
  if (widgets) {
    setters.setWidgets(widgets);
  }
  const widgetStats = getReactionWidgetStatsOrNull(
    (pv as { reactionsWidgetStats?: unknown }).reactionsWidgetStats,
  );
  if (widgetStats) {
    setters.setWidgetStats(widgetStats);
  }
}
