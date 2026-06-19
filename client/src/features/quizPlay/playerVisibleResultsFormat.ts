import type {
  PlayerVisibleResultOptionStat,
  PlayerVisibleResultTile,
} from "../../pages/quiz-play/types";
import { formatTemperatureScaleLabel } from "@meyouquize/shared";

export type RankingMetricMode = "avg_rank" | "avg_score" | "total_score";

export function resolveRankingMetricMode(tile: PlayerVisibleResultTile): RankingMetricMode | null {
  if (tile.type !== "ranking") return null;
  const requested = tile.rankingProjectorMetric ?? "avg_rank";
  const hasTierStats = tile.optionStats.some(
    (o) => typeof o.avgScore === "number" || typeof o.totalScore === "number",
  );
  return requested !== "avg_rank" && !hasTierStats ? "avg_rank" : requested;
}

export function formatTemperatureResultHeadline(value: number | null | undefined): string | null {
  const label = formatTemperatureScaleLabel(value);
  return label ? `Итог: ${label}` : null;
}

export function formatPlayerResultStatValue(
  row: PlayerVisibleResultOptionStat,
  rankingMetricMode: RankingMetricMode | null,
  pct: number,
  questionType?: PlayerVisibleResultTile["type"],
): string {
  if (questionType === "temperature") {
    return String(row.count);
  }
  if (rankingMetricMode === "avg_rank") {
    return typeof row.avgRank === "number" && row.avgRank > 0 ? row.avgRank.toFixed(2) : "—";
  }
  if (rankingMetricMode === "avg_score") {
    return typeof row.avgScore === "number" ? row.avgScore.toFixed(2) : "—";
  }
  if (rankingMetricMode === "total_score") {
    return typeof row.totalScore === "number" ? String(Math.round(row.totalScore)) : "—";
  }
  return `${pct}%`;
}
