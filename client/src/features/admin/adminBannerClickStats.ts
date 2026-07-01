import type { PublicBannerClickStats } from "../../publicViewContract";

export function getBannerClickStatsOrNull(value: unknown): PublicBannerClickStats[] | null {
  if (!Array.isArray(value)) return null;
  const result: PublicBannerClickStats[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { bannerId?: unknown; uniqueClicks?: unknown };
    if (typeof row.bannerId !== "string" || !row.bannerId.trim()) continue;
    const uniqueClicks = Number(row.uniqueClicks);
    result.push({
      bannerId: row.bannerId.trim(),
      uniqueClicks: Number.isFinite(uniqueClicks) ? Math.max(0, Math.trunc(uniqueClicks)) : 0,
    });
  }
  return result;
}

export function bannerClickCountsFromStats(
  stats: PublicBannerClickStats[],
): Record<string, number> {
  return stats.reduce<Record<string, number>>((acc, row) => {
    acc[row.bannerId] = row.uniqueClicks;
    return acc;
  }, {});
}
