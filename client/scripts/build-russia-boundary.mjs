import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "russia-boundary.json");
const sourceUrl =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RUS/ADM0/geoBoundaries-RUS-ADM0_simplified.geojson";

/** Видовой прямоугольник «Россия целиком» в развёртке через 180°. */
const LON_MIN = 18;
const LON_MAX = 192;
const LAT_MIN = 40.5;
const LAT_MAX = 82.5;
const WIDTH = 1100;
const HEIGHT = 480;
const PAD = 18;
const MIN_RING_POINTS = 8;

mkdirSync(dirname(outPath), { recursive: true });

function download(url) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        download(response.headers.location).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    }).on("error", reject);
  });
}

function unwrapLon(lon) {
  return lon < 0 ? lon + 360 : lon;
}

function projectPoint(lon, lat) {
  const x = PAD + ((unwrapLon(lon) - LON_MIN) / (LON_MAX - LON_MIN)) * (WIDTH - PAD * 2);
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (HEIGHT - PAD * 2);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function simplifyRing(ring, step) {
  if (ring.length <= 48 || step <= 1) return ring;
  const out = [];
  for (let i = 0; i < ring.length - 1; i += step) out.push(ring[i]);
  const first = out[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (last[0] !== first[0] || last[1] !== first[1]) out.push(last);
  else out.push([first[0], first[1]]);
  return out;
}

function ringCentroidLon(ring) {
  let sum = 0;
  for (const [lon] of ring) sum += unwrapLon(lon);
  return sum / ring.length;
}

function keepPolygon(polygon) {
  const ring = polygon[0];
  if (!ring || ring.length < MIN_RING_POINTS) return false;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const [lon] of ring) {
    const u = unwrapLon(lon);
    minLon = Math.min(minLon, u);
    maxLon = Math.max(maxLon, u);
  }
  if (maxLon - minLon > 175) return false;
  const avg = ringCentroidLon(ring);
  if (avg < LON_MIN - 1 || avg > LON_MAX + 1) return false;
  return true;
}

function projectRing(ring) {
  const avg = ringCentroidLon(ring);
  const isMainland = avg < 150;
  // У mainland ребро по 180° — искусственный шов geoBoundaries; убираем его.
  const cleaned = isMainland
    ? ring.filter(([lon]) => {
        const u = unwrapLon(lon);
        return u < 179.2 || u > 180.8;
      })
    : ring;
  if (cleaned.length < 4) return null;
  const step = cleaned.length > 4000 ? 6 : cleaned.length > 800 ? 3 : 1;
  const projected = simplifyRing(cleaned, step).map(([lon, lat]) => projectPoint(lon, lat));
  // Замыкаем кольцо.
  const first = projected[0];
  const last = projected[projected.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    projected.push([first[0], first[1]]);
  }
  return projected;
}

const raw = await download(sourceUrl);
const collection = JSON.parse(raw);
const feature = collection.features[0];

const polygons = feature.geometry.coordinates
  .filter(keepPolygon)
  .map((polygon) => {
    const rings = polygon.map(projectRing).filter((ring) => ring != null && ring.length >= 4);
    return rings.length > 0 ? rings : null;
  })
  .filter((polygon) => polygon != null);

const output = {
  type: "Feature",
  properties: {
    source: "geoBoundaries RUS ADM0 simplified",
    license: "CC-BY 4.0",
    projection: "equirectangular-russia",
    lonMin: LON_MIN,
    lonMax: LON_MAX,
    latMin: LAT_MIN,
    latMax: LAT_MAX,
    width: WIDTH,
    height: HEIGHT,
    pad: PAD,
  },
  geometry: {
    type: "MultiPolygon",
    coordinates: polygons,
  },
};

writeFileSync(outPath, JSON.stringify(output));
console.log(
  `Wrote ${outPath} (${polygons.length} polygons, ${Buffer.byteLength(JSON.stringify(output))} bytes)`,
);
