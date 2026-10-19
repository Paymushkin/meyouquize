import {
  geoPollRegionHeatIntensity,
  resolveGeoPollRegionHeatFillOpacity,
} from "@meyouquize/shared";

/** @deprecated use GEO / resolve helpers from shared; kept for map opacity tests */
export const GEO_POLL_REGION_FILL_OPACITY_MIN = 0.28;
export const GEO_POLL_REGION_FILL_OPACITY_MAX = 0.95;

/**
 * Непрозрачность заливки региона по числу голосов (шкала «по цвету подсветки»).
 */
export function geoPollRegionFillOpacity(count: number, maxCount: number): number {
  return resolveGeoPollRegionHeatFillOpacity("region", geoPollRegionHeatIntensity(count, maxCount));
}
