/** Шкала интенсивности заливки регионов геоопроса (брендирование). */
export type GeoPollRegionHeatScale =
  | "region"
  | "cold_warm"
  | "magma"
  | "teal_amber"
  | "violet_gold";

export const GEO_POLL_REGION_HEAT_SCALE_OPTIONS: ReadonlyArray<{
  id: GeoPollRegionHeatScale;
  label: string;
}> = [
  { id: "region", label: "По цвету подсветки" },
  { id: "cold_warm", label: "Холодный → тёплый" },
  { id: "magma", label: "Магма" },
  { id: "teal_amber", label: "Бирюза → янтарь" },
  { id: "violet_gold", label: "Фиолет → золото" },
];

export const DEFAULT_GEO_POLL_REGION_HEAT_SCALE: GeoPollRegionHeatScale = "region";

const HEAT_SCALE_IDS = new Set<string>(GEO_POLL_REGION_HEAT_SCALE_OPTIONS.map((o) => o.id));

/** Фиксированные палитры (кроме `region`, где цвет берётся из подсветки). */
const HEAT_SCALE_STOPS: Record<Exclude<GeoPollRegionHeatScale, "region">, readonly string[]> = {
  cold_warm: ["#2B6CB0", "#38B2AC", "#ECC94B", "#E53E3E"],
  magma: ["#1B0C2E", "#7B2D8E", "#E85D04", "#F8E287"],
  teal_amber: ["#0F766E", "#14B8A6", "#F59E0B", "#FDE68A"],
  violet_gold: ["#3B1F6E", "#7C3AED", "#F59E0B", "#FDE68A"],
};

export function isGeoPollRegionHeatScale(value: unknown): value is GeoPollRegionHeatScale {
  return typeof value === "string" && HEAT_SCALE_IDS.has(value);
}

export function normalizeGeoPollRegionHeatScale(
  value: unknown,
  fallback: GeoPollRegionHeatScale = DEFAULT_GEO_POLL_REGION_HEAT_SCALE,
): GeoPollRegionHeatScale {
  return isGeoPollRegionHeatScale(value) ? value : fallback;
}

export function geoPollRegionHeatScaleLabel(id: GeoPollRegionHeatScale): string {
  return GEO_POLL_REGION_HEAT_SCALE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function parseHex6(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex6(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateHexStops(stops: readonly string[], t: number): string {
  if (stops.length === 0) return "#808080";
  if (stops.length === 1) return stops[0]!;
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const a = parseHex6(stops[i]!) ?? [128, 128, 128];
  const b = parseHex6(stops[i + 1]!) ?? a;
  return toHex6(lerp(a[0], b[0], localT), lerp(a[1], b[1], localT), lerp(a[2], b[2], localT));
}

/** Доля интенсивности 0…1 по числу голосов относительно максимума. */
export function geoPollRegionHeatIntensity(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.min(1, count / maxCount);
}

/**
 * Цвет заливки региона при включённой шкале.
 * Для `region` — цвет подсветки; иначе — интерполяция по пресету.
 */
export function resolveGeoPollRegionHeatFillColor(
  scale: GeoPollRegionHeatScale,
  intensity: number,
  regionFillVoted: string,
): string {
  if (scale === "region") {
    return parseHex6(regionFillVoted) ? regionFillVoted.trim() : "#5d5d5d";
  }
  return interpolateHexStops(HEAT_SCALE_STOPS[scale], intensity);
}

/**
 * Непрозрачность заливки при включённой шкале.
 * Для `region` — как раньше (минимум…максимум); для цветовых пресетов — почти сплошная.
 */
export function resolveGeoPollRegionHeatFillOpacity(
  scale: GeoPollRegionHeatScale,
  intensity: number,
): number {
  if (intensity <= 0) return 0;
  if (scale === "region") {
    const MIN = 0.28;
    const MAX = 0.95;
    return MIN + (MAX - MIN) * intensity;
  }
  return 0.88 + 0.1 * intensity;
}

/** CSS linear-gradient для легенды (слева меньше, справа больше). */
export function geoPollRegionHeatLegendCssGradient(
  scale: GeoPollRegionHeatScale,
  regionFillVoted: string,
): string {
  if (scale === "region") {
    const color = parseHex6(regionFillVoted) ? regionFillVoted.trim() : "#5d5d5d";
    const rgb = parseHex6(color)!;
    const toRgba = (a: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
    return `linear-gradient(90deg, ${toRgba(0.28)}, ${toRgba(0.95)})`;
  }
  const stops = HEAT_SCALE_STOPS[scale];
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
