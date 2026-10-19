import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Position } from "geojson";
import countries110m from "world-atlas/countries-110m.json";
import {
  DEFAULT_GEO_POLL_REGION_HEAT_SCALE,
  geoPollMapKind,
  geoPollRegionHeatIntensity,
  geoPollRegionHeatLegendCssGradient,
  optionText,
  resolveGeoPollRegionHeatFillColor,
  resolveGeoPollRegionHeatFillOpacity,
  type GeoPollRegionHeatScale,
} from "@meyouquize/shared";
import russiaWorldExtraTerritories from "../../data/russia-world-extra-territories.json";
import ukraineWorldWithoutExtras from "../../data/ukraine-world-without-extras.json";
import { projectRussiaLatLon, russiaSvgMap } from "./russiaMapGeometry";

type ProjectorGeoPollMapProps = {
  dictionaryId: string;
  optionStats: Array<{ text?: string; count: number; lat?: number; lon?: number }>;
  brandPrimaryColor?: string;
  voteOptionTextColor?: string;
  brandFontFamily?: string;
  /** Боковой список ответов на проекторе (админка). */
  showAnswerList?: boolean;
  /** Интенсивность заливки регионов по числу голосов (выкл. по умолчанию). */
  regionHeatEnabled?: boolean;
  /** Пресет шкалы интенсивности (брендирование). */
  regionHeatScale?: GeoPollRegionHeatScale;
  markerColor?: string;
  regionFillIdle?: string;
  regionFillVoted?: string;
  regionStrokeIdle?: string;
  regionStrokeVoted?: string;
};

/** Меньше padding — карта стран крупнее в том же viewBox. */
const WORLD_MAP_PADDING = 8;
/** Natural Earth / world-atlas: ISO numeric 010 = Антарктида (Mercator раздувает её внизу). */
const WORLD_MAP_EXCLUDED_IDS = new Set(["010"]);
/**
 * Сдвиг центральной меридианы (~20°E), чтобы разрез ±180° ушёл в Атлантику
 * и Россия рисовалась целиком справа, без обрезка Чукотки слева.
 */
const WORLD_MAP_ROTATE: [number, number] = [-20, 0];
/** ISO numeric USA — у Аляски куски уезжают вправо вместе с Чукоткой; возвращаем их на левый край. */
const WORLD_MAP_USA_ID = "840";
/** ISO numeric Russia — дорисовываем Крым и новые территории поверх Украины. */
const WORLD_MAP_RUSSIA_ID = "643";
/** ISO numeric Ukraine — без Крыма и новых территорий. */
const WORLD_MAP_UKRAINE_ID = "804";
const MARKER_CORE_R = 3;
const MARKER_GLOW_R = 6;
/** Дефолты = текущие константы карты (брендирование PublicView). */
const DEFAULT_MARKER_COLOR = "#F0B429";
const DEFAULT_REGION_FILL_IDLE = "#323232";
const DEFAULT_REGION_FILL_VOTED = "#5d5d5d";
const DEFAULT_REGION_STROKE_IDLE = "#4a4a4a";
const DEFAULT_REGION_STROKE_VOTED = "#ffffff";
const REGION_STROKE_WIDTH_IDLE = 0.45;
const REGION_STROKE_WIDTH_VOTED = 0.9;
const REGION_HIGHLIGHT_MS = 1400;
/** Сколько держать появление нового города (вспышка точки). */
const APPEAR_BURST_MS = 3600;
/** Задержка перед появлением названия (сначала точка). */
const LABEL_DELAY_MS = 700;

type MapLandPath = {
  id: string;
  d: string;
};

type MapMarker = {
  name: string;
  count: number;
  x: number;
  y: number;
};

type MapLayout = {
  mapKind: "world" | "russia" | "centralAsia";
  viewBox: string;
  landPaths: MapLandPath[];
  markers: MapMarker[];
};

/** ISO numeric: KZ, KG, TJ, TM, UZ. */
const CENTRAL_ASIA_WORLD_IDS = new Set(["398", "417", "762", "795", "860"]);

/** «Екатеринбург, Россия» → «Екатеринбург»; страны без запятой остаются как есть. */
function markerDisplayName(label: string): string {
  const idx = label.lastIndexOf(", ");
  return idx > 0 ? label.slice(0, idx).trim() : label;
}

function russiaExtraMultiPolygon(): MultiPolygon | null {
  const geom = (russiaWorldExtraTerritories as FeatureCollection<Geometry>).features[0]?.geometry;
  return geom?.type === "MultiPolygon" ? geom : null;
}

/** Крым, Севастополь, ДНР, ЛНР, Херсонская и Запорожская — в силуэт России. */
function mergeRussiaExtraTerritories(f: Feature<Geometry>): Feature<Geometry> {
  const extras = russiaExtraMultiPolygon();
  const geom = f.geometry;
  if (!extras || !geom) return f;
  const base: Position[][][] =
    geom.type === "MultiPolygon"
      ? geom.coordinates
      : geom.type === "Polygon"
        ? [geom.coordinates]
        : [];
  if (base.length === 0) return f;
  return {
    ...f,
    geometry: {
      type: "MultiPolygon",
      coordinates: [...base, ...extras.coordinates],
    },
  };
}

function replaceUkraineWithoutExtras(f: Feature<Geometry>): Feature<Geometry> {
  const replacement = ukraineWorldWithoutExtras as Feature<Geometry>;
  if (!replacement.geometry) return f;
  return {
    ...f,
    geometry: replacement.geometry,
  };
}

function loadWorldFeatures(): FeatureCollection<Geometry> {
  const topology = countries110m as unknown as {
    objects: { countries: Parameters<typeof feature>[1] };
  };
  const all = feature(
    countries110m as unknown as Parameters<typeof feature>[0],
    topology.objects.countries,
  ) as FeatureCollection<Geometry>;
  return {
    ...all,
    features: all.features
      .filter((f) => !WORLD_MAP_EXCLUDED_IDS.has(String(f.id ?? "")))
      .map((f) => {
        const id = String(f.id ?? "");
        if (id === WORLD_MAP_RUSSIA_ID) return mergeRussiaExtraTerritories(f);
        if (id === WORLD_MAP_UKRAINE_ID) return replaceUkraineWithoutExtras(f);
        return f;
      }),
  };
}

function worldMapPixelWidth(projection: GeoProjection): number {
  return 2 * Math.PI * projection.scale();
}

/** Западная Аляска / Алеуты — география, которая при rotate([-20]) оказывается справа. */
function isAlaskaWrapGeo(lon: number, lat: number): boolean {
  return lat > 50 && (lon < -129 || lon > 160);
}

function projectWorldLonLat(
  lon: number,
  lat: number,
  projection: GeoProjection,
  worldW: number,
  midX: number,
): [number, number] | null {
  const projected = projection([lon, lat]);
  if (!projected) return null;
  let [x] = projected;
  const y = projected[1];
  if (isAlaskaWrapGeo(lon, lat) && x > midX) x -= worldW;
  return [x, y];
}

function svgPathFromPolygonRings(
  rings: Position[][],
  projection: GeoProjection,
  worldW: number,
  midX: number,
): string {
  const parts: string[] = [];
  for (const ring of rings) {
    let d = "";
    let started = false;
    for (const pos of ring) {
      const lon = pos[0];
      const lat = pos[1];
      if (lon == null || lat == null) continue;
      const pt = projectWorldLonLat(lon, lat, projection, worldW, midX);
      if (!pt) continue;
      d += `${started ? "L" : "M"}${pt[0]},${pt[1]}`;
      started = true;
    }
    if (started) parts.push(`${d}Z`);
  }
  return parts.join("");
}

/** Путь страны с разворачиванием Аляски на левый край (для USA и любых точек-маркеров). */
function landPathDataForFeature(
  f: Feature<Geometry>,
  projection: GeoProjection,
  worldW: number,
  midX: number,
  pathGen: ReturnType<typeof geoPath>,
): string | null {
  const id = String(f.id ?? "");
  const geom = f.geometry;
  if (id === WORLD_MAP_USA_ID && geom) {
    if (geom.type === "Polygon") {
      const d = svgPathFromPolygonRings(geom.coordinates, projection, worldW, midX);
      return d || null;
    }
    if (geom.type === "MultiPolygon") {
      const d = geom.coordinates
        .map((polygon) => svgPathFromPolygonRings(polygon, projection, worldW, midX))
        .filter(Boolean)
        .join("");
      return d || null;
    }
  }
  return pathGen(f);
}

function projectWorldMarkers(
  optionStats: ProjectorGeoPollMapProps["optionStats"],
  projection: GeoProjection,
  worldW: number,
  midX: number,
): MapMarker[] {
  return optionStats
    .filter(
      (row) =>
        row.lat != null && row.lon != null && Number.isFinite(row.lat) && Number.isFinite(row.lon),
    )
    .map((row) => {
      const projected = projectWorldLonLat(row.lon!, row.lat!, projection, worldW, midX);
      if (!projected) return null;
      return {
        name: optionText(row.text),
        count: row.count,
        x: projected[0],
        y: projected[1],
      };
    })
    .filter((row): row is MapMarker => row != null);
}

function projectRussiaMarkers(optionStats: ProjectorGeoPollMapProps["optionStats"]): MapMarker[] {
  return optionStats
    .filter(
      (row) =>
        row.lat != null && row.lon != null && Number.isFinite(row.lat) && Number.isFinite(row.lon),
    )
    .map((row) => {
      const { x, y } = projectRussiaLatLon(row.lat!, row.lon!);
      return { name: optionText(row.text), count: row.count, x, y };
    });
}

function buildWorldMapLayout(
  world: FeatureCollection<Geometry>,
  optionStats: ProjectorGeoPollMapProps["optionStats"],
  width: number,
  height: number,
): MapLayout {
  const projection = geoMercator()
    .rotate(WORLD_MAP_ROTATE)
    .fitExtent(
      [
        [WORLD_MAP_PADDING, WORLD_MAP_PADDING],
        [width - WORLD_MAP_PADDING, height - WORLD_MAP_PADDING],
      ],
      world,
    );
  const pathGen = geoPath(projection);
  const worldW = worldMapPixelWidth(projection);
  const midX = width / 2;
  const landPaths = world.features
    .map((f) => {
      const d = landPathDataForFeature(f, projection, worldW, midX, pathGen);
      if (!d) return null;
      return { id: String(f.id ?? d.slice(0, 24)), d };
    })
    .filter((row): row is MapLandPath => row != null)
    // Россия с доп. территориями — поверх Украины, иначе Крым останется «украинским».
    .sort((a, b) => {
      if (a.id === WORLD_MAP_RUSSIA_ID) return 1;
      if (b.id === WORLD_MAP_RUSSIA_ID) return -1;
      return 0;
    });

  return {
    mapKind: "world",
    viewBox: `0 0 ${width} ${height}`,
    landPaths,
    markers: projectWorldMarkers(optionStats, projection, worldW, midX),
  };
}

function buildCentralAsiaMapLayout(
  world: FeatureCollection<Geometry>,
  optionStats: ProjectorGeoPollMapProps["optionStats"],
  width: number,
  height: number,
): MapLayout {
  const region: FeatureCollection<Geometry> = {
    type: "FeatureCollection",
    features: world.features.filter((f) => CENTRAL_ASIA_WORLD_IDS.has(String(f.id ?? ""))),
  };
  const projection = geoMercator().fitExtent(
    [
      [WORLD_MAP_PADDING, WORLD_MAP_PADDING],
      [width - WORLD_MAP_PADDING, height - WORLD_MAP_PADDING],
    ],
    region,
  );
  const pathGen = geoPath(projection);
  const landPaths = region.features
    .map((f) => {
      const d = pathGen(f);
      if (!d) return null;
      return { id: String(f.id ?? d.slice(0, 24)), d };
    })
    .filter((row): row is MapLandPath => row != null);
  const markers = optionStats
    .filter(
      (row) =>
        row.lat != null && row.lon != null && Number.isFinite(row.lat) && Number.isFinite(row.lon),
    )
    .map((row) => {
      const projected = projection([row.lon!, row.lat!]);
      if (!projected) return null;
      return {
        name: optionText(row.text),
        count: row.count,
        x: projected[0],
        y: projected[1],
      };
    })
    .filter((row): row is MapMarker => row != null);

  return {
    mapKind: "centralAsia",
    viewBox: `0 0 ${width} ${height}`,
    landPaths,
    markers,
  };
}

function buildRussiaOnlyMapLayout(optionStats: ProjectorGeoPollMapProps["optionStats"]): MapLayout {
  return {
    mapKind: "russia",
    viewBox: russiaSvgMap.viewBox,
    landPaths: russiaSvgMap.paths.map((p) => ({ id: p.id, d: p.d })),
    markers: projectRussiaMarkers(optionStats),
  };
}

function useGeoPollMapModel(
  dictionaryId: string,
  optionStats: ProjectorGeoPollMapProps["optionStats"],
): MapLayout {
  return useMemo(() => {
    const mapKind = geoPollMapKind(dictionaryId);
    if (mapKind === "russia") {
      return buildRussiaOnlyMapLayout(optionStats);
    }
    const world = loadWorldFeatures();
    if (mapKind === "centralAsia") {
      return buildCentralAsiaMapLayout(world, optionStats, 960, 500);
    }
    return buildWorldMapLayout(world, optionStats, 960, 500);
  }, [dictionaryId, optionStats]);
}

type PathHitMeta = {
  id: string;
  d: string;
  cx: number;
  cy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  area: number;
  /** Линеаризованные кольца для point-in-path. */
  rings: Array<Array<[number, number]>>;
};

function parseSvgPathCommands(d: string): Array<{ c: string; nums: number[] }> {
  const cmds: Array<{ c: string; nums: number[] }> = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d)) != null) {
    const nums = (match[2]!.trim().match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    cmds.push({ c: match[1]!, nums });
  }
  return cmds;
}

/** Аппроксимация SVG path → полигоны (для ray-cast). */
function sampleSvgPathRings(d: string): Array<Array<[number, number]>> {
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const rings: Array<Array<[number, number]>> = [];
  let ring: Array<[number, number]> = [];
  const push = (px: number, py: number) => {
    ring.push([px, py]);
    x = px;
    y = py;
  };

  for (const { c: cmd, nums } of parseSvgPathCommands(d)) {
    if (cmd === "M") {
      if (ring.length > 0) {
        rings.push(ring);
        ring = [];
      }
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i === 0) {
          startX = nums[i]!;
          startY = nums[i + 1]!;
        }
        push(nums[i]!, nums[i + 1]!);
      }
    } else if (cmd === "m") {
      if (ring.length > 0) {
        rings.push(ring);
        ring = [];
      }
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i === 0) {
          startX = x + nums[i]!;
          startY = y + nums[i + 1]!;
          push(startX, startY);
        } else {
          push(x + nums[i]!, y + nums[i + 1]!);
        }
      }
    } else if (cmd === "L") {
      for (let i = 0; i + 1 < nums.length; i += 2) push(nums[i]!, nums[i + 1]!);
    } else if (cmd === "l") {
      for (let i = 0; i + 1 < nums.length; i += 2) push(x + nums[i]!, y + nums[i + 1]!);
    } else if (cmd === "H") {
      for (const n of nums) push(n, y);
    } else if (cmd === "h") {
      for (const n of nums) push(x + n, y);
    } else if (cmd === "V") {
      for (const n of nums) push(x, n);
    } else if (cmd === "v") {
      for (const n of nums) push(x, y + n);
    } else if (cmd === "C") {
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const x0 = x;
        const y0 = y;
        const x1 = nums[i]!;
        const y1 = nums[i + 1]!;
        const x2 = nums[i + 2]!;
        const y2 = nums[i + 3]!;
        const x3 = nums[i + 4]!;
        const y3 = nums[i + 5]!;
        for (let t = 1; t <= 8; t++) {
          const u = t / 8;
          const uu = 1 - u;
          push(
            uu * uu * uu * x0 + 3 * uu * uu * u * x1 + 3 * uu * u * u * x2 + u * u * u * x3,
            uu * uu * uu * y0 + 3 * uu * uu * u * y1 + 3 * uu * u * u * y2 + u * u * u * y3,
          );
        }
      }
    } else if (cmd === "c") {
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const x0 = x;
        const y0 = y;
        const x1 = x + nums[i]!;
        const y1 = y + nums[i + 1]!;
        const x2 = x + nums[i + 2]!;
        const y2 = y + nums[i + 3]!;
        const x3 = x + nums[i + 4]!;
        const y3 = y + nums[i + 5]!;
        for (let t = 1; t <= 8; t++) {
          const u = t / 8;
          const uu = 1 - u;
          push(
            uu * uu * uu * x0 + 3 * uu * uu * u * x1 + 3 * uu * u * u * x2 + u * u * u * x3,
            uu * uu * uu * y0 + 3 * uu * uu * u * y1 + 3 * uu * u * u * y2 + u * u * u * y3,
          );
        }
      }
    } else if (cmd === "Z" || cmd === "z") {
      push(startX, startY);
      rings.push(ring);
      ring = [];
    }
  }
  if (ring.length > 0) rings.push(ring);
  return rings;
}

function pointInRing(x: number, y: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0];
    const yi = ring[i]![1];
    const xj = ring[j]![0];
    const yj = ring[j]![1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPathRings(x: number, y: number, rings: Array<Array<[number, number]>>): boolean {
  let hits = 0;
  for (const ring of rings) {
    if (ring.length >= 3 && pointInRing(x, y, ring)) hits += 1;
  }
  return hits % 2 === 1;
}

function buildPathHitMeta(land: MapLandPath): PathHitMeta {
  const rings = sampleSvgPathRings(land.d);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let sumX = 0;
  let sumY = 0;
  let n = 0;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
      n += 1;
    }
  }
  if (n === 0) {
    return {
      id: land.id,
      d: land.d,
      cx: 0,
      cy: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      area: 0,
      rings: [],
    };
  }
  return {
    id: land.id,
    d: land.d,
    cx: sumX / n,
    cy: sumY / n,
    minX,
    maxX,
    minY,
    maxY,
    area: Math.max(1, (maxX - minX) * (maxY - minY)),
    rings,
  };
}

function findLandPathIdAt(metas: PathHitMeta[], x: number, y: number): string | null {
  if (metas.length === 0) return null;

  // 1) Точный point-in-path (среди кандидатов по bbox — для скорости)
  let bestId: string | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const meta of metas) {
    if (x < meta.minX || x > meta.maxX || y < meta.minY || y > meta.maxY) continue;
    if (!pointInPathRings(x, y, meta.rings)) continue;
    if (meta.area < bestArea) {
      bestArea = meta.area;
      bestId = meta.id;
    }
  }
  if (bestId) return bestId;

  // 2) Fallback: ближайший центроид
  let nearest: { id: string; dist: number } | null = null;
  for (const meta of metas) {
    const dist = Math.hypot(x - meta.cx, y - meta.cy);
    if (!nearest || dist < nearest.dist) nearest = { id: meta.id, dist };
  }
  return nearest?.id ?? null;
}

/** Легенда интенсивности заливки: слева меньше голосов, справа больше. */
function GeoPollRegionHeatLegend({
  scale,
  fillColor,
  textColor,
  fontFamily,
}: {
  scale: GeoPollRegionHeatScale;
  fillColor: string;
  textColor: string;
  fontFamily?: string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ width: "100%" }}
      aria-label="Легенда интенсивности заливки регионов"
    >
      <Typography
        variant="h6"
        sx={{
          color: alpha(textColor, 0.85),
          fontFamily,
          flexShrink: 0,
          whiteSpace: "nowrap",
          fontWeight: 500,
          fontSize: { xs: "1rem", md: "1.25rem" },
        }}
      >
        меньше голосов
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: { xs: 14, md: 18 },
          borderRadius: 1.5,
          background: geoPollRegionHeatLegendCssGradient(scale, fillColor),
          border: `1px solid ${alpha(textColor, 0.25)}`,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          color: alpha(textColor, 0.85),
          fontFamily,
          flexShrink: 0,
          whiteSpace: "nowrap",
          fontWeight: 500,
          fontSize: { xs: "1rem", md: "1.25rem" },
        }}
      >
        больше голосов
      </Typography>
    </Stack>
  );
}

/** Idle-силуэт + заливка проголосовавших регионов (опционально opacity/цвет ∝ числу ответов). */
function MapLandBackground({
  landPaths,
  pathVoteCounts,
  regionHeatEnabled,
  regionHeatScale,
  regionFillIdle,
  regionFillVoted,
  regionStrokeIdle,
  regionStrokeVoted,
}: {
  landPaths: MapLandPath[];
  pathVoteCounts: Map<string, number>;
  regionHeatEnabled: boolean;
  regionHeatScale: GeoPollRegionHeatScale;
  regionFillIdle: string;
  regionFillVoted: string;
  regionStrokeIdle: string;
  regionStrokeVoted: string;
}) {
  const idleSilhouetteD = landPaths.map((land) => land.d).join(" ");
  const maxVotes = Math.max(0, ...pathVoteCounts.values());
  const highlightTransition = `fill ${REGION_HIGHLIGHT_MS}ms ease-in-out, fill-opacity ${REGION_HIGHLIGHT_MS}ms ease-in-out, stroke ${REGION_HIGHLIGHT_MS}ms ease-in-out, stroke-width ${REGION_HIGHLIGHT_MS}ms ease-in-out, opacity ${REGION_HIGHLIGHT_MS}ms ease-in-out`;

  return (
    <>
      <path
        d={idleSilhouetteD}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          fill: regionFillIdle,
          stroke: regionFillIdle,
          strokeWidth: 0.6,
        }}
      />
      {landPaths.map((land) => {
        const votes = pathVoteCounts.get(land.id) ?? 0;
        const voted = votes > 0;
        return (
          <path
            key={`fill-${land.id}`}
            d={land.d}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              fill: regionFillIdle,
              stroke: voted ? "none" : regionStrokeIdle,
              strokeWidth: voted ? 0 : REGION_STROKE_WIDTH_IDLE,
              transition: highlightTransition,
            }}
          />
        );
      })}
      {landPaths.map((land) => {
        const votes = pathVoteCounts.get(land.id) ?? 0;
        if (votes <= 0) return null;
        const intensity = geoPollRegionHeatIntensity(votes, maxVotes);
        return (
          <path
            key={`heat-${land.id}`}
            d={land.d}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              fill: regionHeatEnabled
                ? resolveGeoPollRegionHeatFillColor(regionHeatScale, intensity, regionFillVoted)
                : regionFillVoted,
              fillOpacity: regionHeatEnabled
                ? resolveGeoPollRegionHeatFillOpacity(regionHeatScale, intensity)
                : 1,
              stroke: "none",
              pointerEvents: "none",
              transition: highlightTransition,
            }}
          />
        );
      })}
      {landPaths.map((land) => {
        const voted = (pathVoteCounts.get(land.id) ?? 0) > 0;
        return (
          <path
            key={`stroke-${land.id}`}
            d={land.d}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              stroke: regionStrokeVoted,
              strokeWidth: REGION_STROKE_WIDTH_VOTED,
              opacity: voted ? 1 : 0,
              pointerEvents: "none",
              transition: `opacity ${REGION_HIGHLIGHT_MS}ms ease-in-out`,
            }}
          />
        );
      })}
    </>
  );
}

function MapMarkerDot({
  marker,
  color,
  glowFilterId,
  appearBurst,
}: {
  marker: MapMarker;
  color: string;
  glowFilterId: string;
  appearBurst: boolean;
}) {
  if (appearBurst) {
    return (
      <g transform={`translate(${marker.x}, ${marker.y})`}>
        <circle
          r={28}
          fill="rgba(255,255,255,0.42)"
          style={{
            transformOrigin: "0px 0px",
            animation: `geoSoftFlash ${APPEAR_BURST_MS * 0.55}ms ease-out forwards`,
          }}
        />
        <circle
          r={15}
          fill="rgba(255,255,255,0.55)"
          style={{
            transformOrigin: "0px 0px",
            animation: `geoSoftFlash ${APPEAR_BURST_MS * 0.45}ms ease-out 0.08s both`,
          }}
        />
        <circle
          r={MARKER_GLOW_R}
          fill="rgba(255,255,255,0.7)"
          filter={`url(#${glowFilterId})`}
          style={{
            transformOrigin: "0px 0px",
            animation: `geoGlowWhiteToYellow ${APPEAR_BURST_MS}ms ease-out forwards`,
          }}
        />
        <circle
          r={MARKER_CORE_R}
          fill="#ffffff"
          filter={`url(#${glowFilterId})`}
          style={{
            transformOrigin: "0px 0px",
            animation: `geoCoreWhiteToYellow ${APPEAR_BURST_MS}ms ease-out forwards`,
          }}
        />
      </g>
    );
  }

  return (
    <g transform={`translate(${marker.x}, ${marker.y})`}>
      <circle r={MARKER_CORE_R} fill={color} filter={`url(#${glowFilterId})`} />
    </g>
  );
}

function MapMarkerLabel({
  marker,
  textColor,
  fontFamily,
  fontSize,
  appearBurst,
}: {
  marker: MapMarker;
  textColor: string;
  fontFamily?: string;
  fontSize: number;
  appearBurst: boolean;
}) {
  const label = markerDisplayName(marker.name);
  const labelAboveY = -MARKER_GLOW_R - 8;
  const labelBesideX = MARKER_GLOW_R + 8;

  if (appearBurst) {
    return (
      <g transform={`translate(${marker.x}, ${marker.y})`}>
        <text
          x={labelBesideX}
          y={4}
          textAnchor="start"
          fill={textColor}
          fontSize={fontSize}
          fontWeight={800}
          fontFamily={fontFamily || "inherit"}
          style={{
            paintOrder: "stroke",
            stroke: "rgba(0,0,0,0.55)",
            strokeWidth: 3,
            opacity: 0,
            animation: `geoLabelFadeIn 0.55s ease-out ${LABEL_DELAY_MS}ms forwards`,
          }}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${marker.x}, ${marker.y})`}>
      <text
        x={0}
        y={labelAboveY}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontWeight={800}
        fontFamily={fontFamily || "inherit"}
        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.55)", strokeWidth: 3 }}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Новые маркеры ловим в том же render (не после paint) — иначе первая отрисовка как «обычная».
 */
function useAppearingMarkerKeys(markers: MapMarker[]): Set<string> {
  const knownRef = useRef<Set<string> | null>(null);
  const [burstKeys, setBurstKeys] = useState<Set<string>>(() => new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  const liveNames = markers.map((m) => m.name);
  const liveNamesKey = liveNames.join("\0");
  const fresh: string[] = [];
  if (knownRef.current) {
    for (const name of liveNames) {
      if (!knownRef.current.has(name)) fresh.push(name);
    }
    for (const name of fresh) knownRef.current.add(name);
  }
  const freshKey = fresh.join("\0");

  const appearKeys = useMemo(() => {
    const next = new Set(burstKeys);
    for (const name of fresh) next.add(name);
    return next;
    // fresh contents tracked via freshKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKeys, freshKey]);

  useLayoutEffect(() => {
    if (knownRef.current === null) {
      knownRef.current = new Set(liveNames);
      return;
    }
    const live = new Set(liveNames);
    for (const key of [...knownRef.current]) {
      if (!live.has(key)) knownRef.current.delete(key);
    }
    if (fresh.length === 0) return;

    setBurstKeys((prev) => {
      const next = new Set(prev);
      for (const name of fresh) next.add(name);
      return next;
    });

    for (const name of fresh) {
      const prevTimer = timersRef.current.get(name);
      if (prevTimer) window.clearTimeout(prevTimer);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(name);
        setBurstKeys((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }, APPEAR_BURST_MS);
      timersRef.current.set(name, timer);
    }
    // liveNames/fresh recomputed each render; keys track content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey, liveNamesKey]);

  return appearKeys;
}

export function ProjectorGeoPollMap({
  dictionaryId,
  optionStats,
  voteOptionTextColor = "#ffffff",
  brandFontFamily,
  showAnswerList = true,
  regionHeatEnabled = false,
  regionHeatScale = DEFAULT_GEO_POLL_REGION_HEAT_SCALE,
  markerColor = DEFAULT_MARKER_COLOR,
  regionFillIdle = DEFAULT_REGION_FILL_IDLE,
  regionFillVoted = DEFAULT_REGION_FILL_VOTED,
  regionStrokeIdle = DEFAULT_REGION_STROKE_IDLE,
  regionStrokeVoted = DEFAULT_REGION_STROKE_VOTED,
}: ProjectorGeoPollMapProps) {
  const glowFilterId = useId().replace(/:/g, "");
  const { viewBox, landPaths, markers } = useGeoPollMapModel(dictionaryId, optionStats);
  const appearingKeys = useAppearingMarkerKeys(markers);
  const pathHitMetas = useMemo(() => landPaths.map(buildPathHitMeta), [landPaths]);
  const pathVoteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (pathHitMetas.length === 0) return counts;
    for (const marker of markers) {
      const pathId = findLandPathIdAt(pathHitMetas, marker.x, marker.y);
      if (!pathId) continue;
      counts.set(pathId, (counts.get(pathId) ?? 0) + marker.count);
    }
    return counts;
  }, [markers, pathHitMetas]);
  const [appearanceOrder, setAppearanceOrder] = useState<string[]>([]);
  useLayoutEffect(() => {
    const liveNames = optionStats.map((row) => optionText(row.text));
    const live = new Set(liveNames);
    setAppearanceOrder((prev) => {
      const kept = prev.filter((name) => live.has(name));
      const known = new Set(kept);
      const added: string[] = [];
      for (const name of liveNames) {
        if (!known.has(name)) added.push(name);
      }
      if (added.length === 0 && kept.length === prev.length) return prev;
      return [...kept, ...added];
    });
  }, [optionStats]);

  const sortedRows = useMemo(() => {
    const orderIndex = new Map(appearanceOrder.map((name, index) => [name, index]));
    return [...optionStats].sort((a, b) => {
      const byCount = b.count - a.count;
      if (byCount !== 0) return byCount;
      return (
        (orderIndex.get(optionText(b.text)) ?? -1) - (orderIndex.get(optionText(a.text)) ?? -1)
      );
    });
  }, [appearanceOrder, optionStats]);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [mapHeightPx, setMapHeightPx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);

  useLayoutEffect(() => {
    const mapEl = mapBoxRef.current;
    if (!mapEl) return;
    const updateMapHeight = () => {
      setMapHeightPx(Math.round(mapEl.getBoundingClientRect().height));
    };
    updateMapHeight();
    const ro = new ResizeObserver(updateMapHeight);
    ro.observe(mapEl);
    return () => ro.disconnect();
  }, [viewBox, markers.length, showAnswerList, regionHeatEnabled]);

  useLayoutEffect(() => {
    if (!showAnswerList) return;
    const el = sidebarRef.current;
    if (!el || mapHeightPx <= 0) return;

    const firstRow = el.querySelector<HTMLElement>("[data-geo-sidebar-row]");
    const rowH = firstRow?.getBoundingClientRect().height ?? 40;
    const styles = getComputedStyle(el);
    const gapRaw = styles.rowGap || styles.gap || "12";
    const gap = Number.parseFloat(gapRaw) || 12;
    const fit = Math.max(1, Math.floor((mapHeightPx + gap) / (rowH + gap)));
    setVisibleCount(Math.min(sortedRows.length, fit));
  }, [sortedRows.length, mapHeightPx, showAnswerList]);

  const topRows = sortedRows.slice(0, visibleCount);

  return (
    <Stack
      direction={{ xs: "column", lg: showAnswerList ? "row" : "column" }}
      spacing={showAnswerList ? 3 : 0}
      sx={{
        width: "100%",
        alignItems: { xs: "stretch", lg: "flex-start" },
        bgcolor: "transparent",
      }}
    >
      <Stack
        ref={mapBoxRef}
        spacing={regionHeatEnabled ? 1.5 : 0}
        sx={{ flex: 1, width: "100%", minWidth: 0, overflow: "hidden" }}
      >
        <Box
          component="svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          sx={{
            display: "block",
            width: "100%",
            height: "auto",
            background: "transparent",
            "@keyframes geoSoftFlash": {
              "0%": { transform: "scale(0.2)", opacity: 0.85 },
              "30%": { transform: "scale(1.1)", opacity: 0.45 },
              "100%": { transform: "scale(2.1)", opacity: 0 },
            },
            "@keyframes geoGlowWhiteToYellow": {
              "0%": {
                transform: "scale(0.55)",
                opacity: 0.95,
                fill: "rgba(255,255,255,0.85)",
              },
              "22%": {
                transform: "scale(1.6)",
                opacity: 0.9,
                fill: "rgba(255,255,255,0.7)",
              },
              "48%": {
                transform: "scale(1.1)",
                opacity: 0.65,
                fill: "rgba(255,240,200,0.55)",
              },
              "100%": {
                transform: "scale(1)",
                opacity: 0.4,
                fill: alpha(markerColor, 0.4),
              },
            },
            "@keyframes geoCoreWhiteToYellow": {
              "0%": { transform: "scale(0.45)", fill: "#ffffff" },
              "18%": { transform: "scale(1.25)", fill: "#ffffff" },
              "42%": { transform: "scale(0.95)", fill: "#FFF3C4" },
              "100%": { transform: "scale(1)", fill: markerColor },
            },
            "@keyframes geoLabelFadeIn": {
              "0%": { opacity: 0 },
              "100%": { opacity: 1 },
            },
          }}
        >
          <defs>
            <filter id={glowFilterId} x="-160%" y="-160%" width="420%" height="420%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <MapLandBackground
            landPaths={landPaths}
            pathVoteCounts={pathVoteCounts}
            regionHeatEnabled={regionHeatEnabled}
            regionHeatScale={regionHeatScale}
            regionFillIdle={regionFillIdle}
            regionFillVoted={regionFillVoted}
            regionStrokeIdle={regionStrokeIdle}
            regionStrokeVoted={regionStrokeVoted}
          />
          {markers.map((marker) => {
            const isNew = appearingKeys.has(marker.name);
            return (
              <MapMarkerDot
                key={`dot-${marker.name}-${marker.x}-${marker.y}-${isNew ? "in" : "on"}`}
                marker={marker}
                color={markerColor}
                glowFilterId={glowFilterId}
                appearBurst={isNew}
              />
            );
          })}
          {markers.map((marker) => {
            const isNew = appearingKeys.has(marker.name);
            return (
              <MapMarkerLabel
                key={`label-${marker.name}-${marker.x}-${marker.y}-${isNew ? "in" : "on"}`}
                marker={marker}
                textColor={voteOptionTextColor}
                fontFamily={brandFontFamily}
                fontSize={13}
                appearBurst={isNew}
              />
            );
          })}
        </Box>
        {regionHeatEnabled ? (
          <GeoPollRegionHeatLegend
            scale={regionHeatScale}
            fillColor={regionFillVoted}
            textColor={voteOptionTextColor}
            fontFamily={brandFontFamily}
          />
        ) : null}
      </Stack>
      {showAnswerList ? (
        <Stack
          ref={sidebarRef}
          spacing={1.5}
          sx={{
            width: { xs: "100%", lg: 200 },
            flexShrink: 0,
            alignSelf: { xs: "stretch", lg: "flex-start" },
            maxHeight: mapHeightPx > 0 ? `${mapHeightPx}px` : undefined,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {topRows.map((row) => {
            const label = optionText(row.text);
            return (
              <Stack
                key={label || row.count}
                data-geo-sidebar-row=""
                direction="row"
                justifyContent="space-between"
                spacing={2}
                sx={{
                  py: 0.75,
                  flexShrink: 0,
                  borderBottom: `1px solid ${alpha(voteOptionTextColor, 0.12)}`,
                  ...(appearingKeys.has(label)
                    ? {
                        animation: "geoPollSidebarIn 0.7s ease-out",
                        "@keyframes geoPollSidebarIn": {
                          "0%": { opacity: 0, transform: "translateX(12px)" },
                          "100%": { opacity: 1, transform: "translateX(0)" },
                        },
                      }
                    : null),
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: voteOptionTextColor, fontFamily: brandFontFamily }}
                >
                  {markerDisplayName(label)}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: voteOptionTextColor, fontWeight: 700, fontFamily: brandFontFamily }}
                >
                  {row.count}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}
