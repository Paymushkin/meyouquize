#!/usr/bin/env node
/**
 * Применяет калибровку из JSON (скачанного из russia-map-calibrate.html)
 * в client/src/components/projector/russiaMapGeometry.ts
 *
 * Local-dev helper. Не используется в runtime production.
 *
 * Usage:
 *   npm run map:apply-controls
 *   node client/scripts/apply-russia-map-controls.mjs path/to/controls.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const target = path.join(root, "client/src/components/projector/russiaMapGeometry.ts");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node client/scripts/apply-russia-map-controls.mjs <controls.json>");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
const controls = payload.controls;
const wx = payload.wx;
const wy = payload.wy;
const cities = payload.cities ?? [];

if (!Array.isArray(controls) || controls.length < 3 || !Array.isArray(wx) || !Array.isArray(wy)) {
  console.error("Invalid payload: need controls (≥3), wx, wy");
  process.exit(1);
}

function fmt(n) {
  const r = Math.round(n * 1e12) / 1e12;
  return Number.isInteger(r) ? String(r) : String(r);
}

function fmtArr(arr) {
  const parts = [];
  for (let i = 0; i < arr.length; i++) {
    const chunk = fmt(arr[i]);
    if (i > 0 && i % 6 === 0) parts.push(`\n  ${chunk}`);
    else parts.push(i === 0 ? chunk : ` ${chunk}`);
  }
  // Fix spacing - rebuild cleaner
  const lines = [];
  for (let i = 0; i < arr.length; i += 6) {
    lines.push(
      "  " +
        arr
          .slice(i, i + 6)
          .map(fmt)
          .join(", "),
    );
  }
  return lines.join(",\n");
}

const nameByLatLon = new Map(cities.map((c) => [`${c.lat}|${c.lon}`, c.name]));

const controlLines = controls
  .map((c) => {
    const name = nameByLatLon.get(`${c.lat}|${c.lon}`) ?? "";
    const comment = name ? ` // ${name}` : "";
    return `  { lat: ${c.lat}, lon: ${c.lon}, x: ${fmt(c.x)}, y: ${fmt(c.y)} },${comment}`;
  })
  .join("\n");

const next = `import russiaSvgPathsJson from "../../data/russia-svg-paths.json";

export type RussiaSvgPath = { id: string; d: string };

export type RussiaSvgMapData = {
  viewBox: string;
  paths: RussiaSvgPath[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  geo: { lonMin: number; lonMax: number; latMin: number; latMax: number };
};

/** Силуэт РФ по субъектам (Wikimedia: Russian regional elections in 2025.svg, CC BY-SA 4.0). */
export const russiaSvgMap = russiaSvgPathsJson as RussiaSvgMapData;

type ControlPoint = { lat: number; lon: number; x: number; y: number };

/**
 * Контрольные точки: lat/lon из словаря geo-poll → точки на SVG.
 * Сгенерировано калибратором (russia-map-calibrate.html).
 */
const RUSSIA_MAP_CONTROLS: ControlPoint[] = [
${controlLines}
];

/** Precomputed TPS weights: [w0..wn-1, a0, aLon, aLat]. */
const RUSSIA_MAP_TPS_WX = [
${fmtArr(wx)},
] as const;
const RUSSIA_MAP_TPS_WY = [
${fmtArr(wy)},
] as const;

function thinPlateU(r: number): number {
  if (r < 1e-12) return 0;
  return r * r * Math.log(r);
}

/**
 * Thin-plate spline: lat/lon → координаты SVG-карты субъектов.
 * Точно проходит через контрольные города.
 */
export function projectRussiaLatLon(lat: number, lon: number): { x: number; y: number } {
  const n = RUSSIA_MAP_CONTROLS.length;
  let x = RUSSIA_MAP_TPS_WX[n]! + RUSSIA_MAP_TPS_WX[n + 1]! * lon + RUSSIA_MAP_TPS_WX[n + 2]! * lat;
  let y = RUSSIA_MAP_TPS_WY[n]! + RUSSIA_MAP_TPS_WY[n + 1]! * lon + RUSSIA_MAP_TPS_WY[n + 2]! * lat;
  for (let i = 0; i < n; i++) {
    const c = RUSSIA_MAP_CONTROLS[i]!;
    const r = Math.hypot(lon - c.lon, lat - c.lat);
    const u = thinPlateU(r);
    x += RUSSIA_MAP_TPS_WX[i]! * u;
    y += RUSSIA_MAP_TPS_WY[i]! * u;
  }
  return { x, y };
}
`;

fs.writeFileSync(target, next);
console.log(`Wrote ${controls.length} controls → ${path.relative(root, target)}`);
