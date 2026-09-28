import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import countries110m from "world-atlas/countries-110m.json";
import { geoPollMapKind } from "@meyouquize/shared";
import { projectRussiaLatLon, russiaSvgMap } from "./russiaMapGeometry";

type ProjectorGeoPollMapProps = {
  dictionaryId: string;
  optionStats: Array<{ text: string; count: number; lat?: number; lon?: number }>;
  brandPrimaryColor?: string;
  voteOptionTextColor?: string;
  brandFontFamily?: string;
};

const WORLD_MAP_PADDING = 24;
const MARKER_CORE_R = 7;
const MARKER_GLOW_R = 14;
/** Тёплый янтарный цвет точек на карте. */
const MARKER_WARM_YELLOW = "#F0B429";
/**
 * Непрозрачные заливки (эквивалент белого с alpha на фоне #111).
 * Полупрозрачный rgba на стыках регионов даёт светлые «швы» из-за двойного alpha.
 */
const REGION_FILL_IDLE = "#323232";
const REGION_FILL_VOTED = "#5d5d5d";
/** Слегка видимые границы субъектов на idle-карте. */
const REGION_STROKE_IDLE = "#4a4a4a";
const REGION_STROKE_VOTED = "#ffffff";
const REGION_STROKE_WIDTH_IDLE = 1.1;
const REGION_STROKE_WIDTH_VOTED = 1.6;
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
  mapKind: "world" | "russia";
  viewBox: string;
  landPaths: MapLandPath[];
  markers: MapMarker[];
};

/** «Екатеринбург, Россия» → «Екатеринбург»; страны без запятой остаются как есть. */
function markerDisplayName(label: string): string {
  const idx = label.lastIndexOf(", ");
  return idx > 0 ? label.slice(0, idx).trim() : label;
}

function loadWorldFeatures(): FeatureCollection<Geometry> {
  const topology = countries110m as unknown as {
    objects: { countries: Parameters<typeof feature>[1] };
  };
  return feature(
    countries110m as unknown as Parameters<typeof feature>[0],
    topology.objects.countries,
  ) as FeatureCollection<Geometry>;
}

function projectWorldMarkers(
  optionStats: ProjectorGeoPollMapProps["optionStats"],
  projection: GeoProjection,
): MapMarker[] {
  return optionStats
    .filter(
      (row) =>
        row.lat != null && row.lon != null && Number.isFinite(row.lat) && Number.isFinite(row.lon),
    )
    .map((row) => {
      const projected = projection([row.lon!, row.lat!]);
      if (!projected) return null;
      return {
        name: row.text,
        count: row.count,
        x: projected[0]!,
        y: projected[1]!,
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
      return { name: row.text, count: row.count, x, y };
    });
}

function buildWorldMapLayout(
  world: FeatureCollection<Geometry>,
  optionStats: ProjectorGeoPollMapProps["optionStats"],
  width: number,
  height: number,
): MapLayout {
  const projection = geoMercator().fitExtent(
    [
      [WORLD_MAP_PADDING, WORLD_MAP_PADDING],
      [width - WORLD_MAP_PADDING, height - WORLD_MAP_PADDING],
    ],
    world,
  );
  const pathGen = geoPath(projection);
  const landPaths = world.features
    .map((f) => {
      const d = pathGen(f);
      if (!d) return null;
      return { id: String(f.id ?? d.slice(0, 24)), d };
    })
    .filter((row): row is MapLandPath => row != null);

  return {
    mapKind: "world",
    viewBox: `0 0 ${width} ${height}`,
    landPaths,
    markers: projectWorldMarkers(optionStats, projection),
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
    return buildWorldMapLayout(loadWorldFeatures(), optionStats, 960, 500);
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

function RussiaMapBackground({
  landPaths,
  mapKind,
  votedPathIds,
}: {
  landPaths: MapLandPath[];
  mapKind: "world" | "russia";
  votedPathIds: Set<string>;
}) {
  if (mapKind !== "russia") {
    return (
      <>
        {landPaths.map((land) => (
          <path
            key={land.id}
            d={land.d}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              fill: "rgba(255,255,255,0.1)",
              stroke: "rgba(255,255,255,0.32)",
              strokeWidth: 0.8,
            }}
          />
        ))}
      </>
    );
  }

  /** Непрозрачный силуэт без внутренних швов; субъекты сверху — границы и подсветка. */
  const idleSilhouetteD = landPaths.map((land) => land.d).join(" ");
  const highlightTransition = `fill ${REGION_HIGHLIGHT_MS}ms ease-in-out, stroke ${REGION_HIGHLIGHT_MS}ms ease-in-out, stroke-width ${REGION_HIGHLIGHT_MS}ms ease-in-out`;

  return (
    <>
      <path
        d={idleSilhouetteD}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          fill: REGION_FILL_IDLE,
          stroke: REGION_FILL_IDLE,
          strokeWidth: 1.25,
        }}
      />
      {/* Заливки + тонкие idle-границы */}
      {landPaths.map((land) => {
        const voted = votedPathIds.has(land.id);
        return (
          <path
            key={`fill-${land.id}`}
            d={land.d}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              fill: voted ? REGION_FILL_VOTED : REGION_FILL_IDLE,
              stroke: voted ? "none" : REGION_STROKE_IDLE,
              strokeWidth: voted ? 0 : REGION_STROKE_WIDTH_IDLE,
              transition: highlightTransition,
            }}
          />
        );
      })}
      {/* Белые границы подсвеченных регионов — поверх соседей, целиком */}
      {landPaths.map((land) => {
        const voted = votedPathIds.has(land.id);
        return (
          <path
            key={`stroke-${land.id}`}
            d={land.d}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              stroke: REGION_STROKE_VOTED,
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
          r={48}
          fill="rgba(255,255,255,0.42)"
          style={{
            transformOrigin: "0px 0px",
            animation: `geoSoftFlash ${APPEAR_BURST_MS * 0.55}ms ease-out forwards`,
          }}
        />
        <circle
          r={26}
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
}: ProjectorGeoPollMapProps) {
  const glowFilterId = useId().replace(/:/g, "");
  const { mapKind, viewBox, landPaths, markers } = useGeoPollMapModel(dictionaryId, optionStats);
  const appearingKeys = useAppearingMarkerKeys(markers);
  const pathHitMetas = useMemo(
    () => (mapKind === "russia" ? landPaths.map(buildPathHitMeta) : []),
    [landPaths, mapKind],
  );
  const votedPathIds = useMemo(() => {
    const ids = new Set<string>();
    if (mapKind !== "russia" || pathHitMetas.length === 0) return ids;
    for (const marker of markers) {
      const pathId = findLandPathIdAt(pathHitMetas, marker.x, marker.y);
      if (pathId) ids.add(pathId);
    }
    return ids;
  }, [mapKind, markers, pathHitMetas]);
  const [appearanceOrder, setAppearanceOrder] = useState<string[]>([]);
  useLayoutEffect(() => {
    const liveNames = optionStats.map((row) => row.text);
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
      return (orderIndex.get(b.text) ?? -1) - (orderIndex.get(a.text) ?? -1);
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
  }, [viewBox, markers.length]);

  useLayoutEffect(() => {
    const el = sidebarRef.current;
    if (!el || mapHeightPx <= 0) return;

    const firstRow = el.querySelector<HTMLElement>("[data-geo-sidebar-row]");
    const rowH = firstRow?.getBoundingClientRect().height ?? 40;
    const styles = getComputedStyle(el);
    const gapRaw = styles.rowGap || styles.gap || "12";
    const gap = Number.parseFloat(gapRaw) || 12;
    const fit = Math.max(1, Math.floor((mapHeightPx + gap) / (rowH + gap)));
    setVisibleCount(Math.min(sortedRows.length, fit));
  }, [sortedRows.length, mapHeightPx]);

  const topRows = sortedRows.slice(0, visibleCount);

  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={3}
      sx={{
        width: "100%",
        alignItems: { xs: "stretch", lg: "flex-start" },
        bgcolor: "transparent",
      }}
    >
      <Box ref={mapBoxRef} sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Box
          component="svg"
          viewBox={viewBox}
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
                fill: alpha(MARKER_WARM_YELLOW, 0.4),
              },
            },
            "@keyframes geoCoreWhiteToYellow": {
              "0%": { transform: "scale(0.45)", fill: "#ffffff" },
              "18%": { transform: "scale(1.25)", fill: "#ffffff" },
              "42%": { transform: "scale(0.95)", fill: "#FFF3C4" },
              "100%": { transform: "scale(1)", fill: MARKER_WARM_YELLOW },
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
          <RussiaMapBackground
            landPaths={landPaths}
            mapKind={mapKind}
            votedPathIds={votedPathIds}
          />
          {markers.map((marker) => {
            const isNew = appearingKeys.has(marker.name);
            return (
              <MapMarkerDot
                key={`dot-${marker.name}-${marker.x}-${marker.y}-${isNew ? "in" : "on"}`}
                marker={marker}
                color={MARKER_WARM_YELLOW}
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
                fontSize={mapKind === "world" ? 12 : 13}
                appearBurst={isNew}
              />
            );
          })}
        </Box>
      </Box>
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
        {topRows.map((row) => (
          <Stack
            key={row.text}
            data-geo-sidebar-row=""
            direction="row"
            justifyContent="space-between"
            spacing={2}
            sx={{
              py: 0.75,
              flexShrink: 0,
              borderBottom: `1px solid ${alpha(voteOptionTextColor, 0.12)}`,
              ...(appearingKeys.has(row.text)
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
              {markerDisplayName(row.text)}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: voteOptionTextColor, fontWeight: 700, fontFamily: brandFontFamily }}
            >
              {row.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
