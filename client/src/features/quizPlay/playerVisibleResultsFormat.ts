import type {
  PlayerVisibleResultOptionStat,
  PlayerVisibleResultTile,
} from "../../pages/quiz-play/types";

export type RankingMetricMode = "avg_rank" | "avg_score" | "total_score";

export function resolveRankingMetricMode(tile: PlayerVisibleResultTile): RankingMetricMode | null {
  if (tile.type !== "ranking") return null;
  const requested = tile.rankingProjectorMetric ?? "avg_rank";
  const hasTierStats = tile.optionStats.some(
    (o) => typeof o.avgScore === "number" || typeof o.totalScore === "number",
  );
  return requested !== "avg_rank" && !hasTierStats ? "avg_rank" : requested;
}

export function formatPlayerResultStatValue(
  row: PlayerVisibleResultOptionStat,
  rankingMetricMode: RankingMetricMode | null,
  pct: number,
): string {
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
