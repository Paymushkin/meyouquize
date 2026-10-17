/**
 * Пересборка SVG-карты субъектов РФ из Wikimedia Commons
 * (File:Russian regional elections in 2025.svg, CC BY-SA 4.0).
 * Однотонная заливка, внутренние границы (stroke) сохраняются.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "russia-svg-paths.json");
const sourcePath = join(__dirname, "..", "src", "data", "russia-regions-source.svg");
const sourceUrl =
  "https://upload.wikimedia.org/wikipedia/commons/3/3a/Russian_regional_elections_in_2025.svg";

mkdirSync(dirname(outPath), { recursive: true });

function download(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "User-Agent": "meyouquize-build/1.0 (map rebuild)" } }, (response) => {
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

function identity() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiply(p, q) {
  return {
    a: p.a * q.a + p.c * q.b,
    b: p.b * q.a + p.d * q.b,
    c: p.a * q.c + p.c * q.d,
    d: p.b * q.c + p.d * q.d,
    e: p.a * q.e + p.c * q.f + p.e,
    f: p.b * q.e + p.d * q.f + p.f,
  };
}

function apply(m, x, y) {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

function parseTransform(attr) {
  let m = identity();
  if (!attr) return m;
  const re = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi;
  let match;
  while ((match = re.exec(attr))) {
    const kind = match[1].toLowerCase();
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    let next = identity();
    if (kind === "matrix" && nums.length >= 6) {
      next = { a: nums[0], b: nums[1], c: nums[2], d: nums[3], e: nums[4], f: nums[5] };
    } else if (kind === "translate") {
      next = { a: 1, b: 0, c: 0, d: 1, e: nums[0] || 0, f: nums[1] || 0 };
    } else if (kind === "scale") {
      const sx = nums[0] ?? 1;
      const sy = nums[1] ?? sx;
      next = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    } else if (kind === "rotate") {
      const ang = ((nums[0] || 0) * Math.PI) / 180;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const cx = nums[1] || 0;
      const cy = nums[2] || 0;
      next = multiply(
        { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy },
        multiply(
          { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 },
          { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy },
        ),
      );
    }
    m = multiply(m, next);
  }
  return m;
}

function tokenizePath(d) {
  const tokens = [];
  const re = /([a-zA-Z])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let match;
  while ((match = re.exec(d))) {
    if (match[1]) tokens.push({ type: "cmd", value: match[1] });
    else tokens.push({ type: "num", value: Number(match[2]) });
  }
  return tokens;
}

function transformPath(d, matrix) {
  const tokens = tokenizePath(d);
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let x0 = 0;
  let y0 = 0;
  const out = [];
  const fmt = (n) => {
    const r = Math.round(n * 1000) / 1000;
    return Number.isInteger(r) ? String(r) : String(r);
  };
  const pushPoint = (px, py) => {
    const [tx, ty] = apply(matrix, px, py);
    out.push(fmt(tx), fmt(ty));
  };
  const read = () => tokens[i++].value;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === "cmd") {
      cmd = t.value;
      i++;
    }
    if (!cmd) break;
    const abs = cmd === cmd.toUpperCase();
    const c = cmd.toLowerCase();

    if (c === "m") {
      let first = true;
      while (i < tokens.length && tokens[i].type === "num") {
        const nx = read();
        const ny = read();
        if (abs) {
          x = nx;
          y = ny;
        } else {
          x += nx;
          y += ny;
        }
        if (first) {
          out.push("M");
          pushPoint(x, y);
          x0 = x;
          y0 = y;
          first = false;
          cmd = abs ? "L" : "l";
        } else {
          out.push("L");
          pushPoint(x, y);
        }
      }
    } else if (c === "l") {
      while (i < tokens.length && tokens[i].type === "num") {
        const nx = read();
        const ny = read();
        if (abs) {
          x = nx;
          y = ny;
        } else {
          x += nx;
          y += ny;
        }
        out.push("L");
        pushPoint(x, y);
      }
    } else if (c === "h") {
      while (i < tokens.length && tokens[i].type === "num") {
        const nx = read();
        x = abs ? nx : x + nx;
        out.push("L");
        pushPoint(x, y);
      }
    } else if (c === "v") {
      while (i < tokens.length && tokens[i].type === "num") {
        const ny = read();
        y = abs ? ny : y + ny;
        out.push("L");
        pushPoint(x, y);
      }
    } else if (c === "c") {
      while (i < tokens.length && tokens[i].type === "num") {
        let x1 = read();
        let y1 = read();
        let x2 = read();
        let y2 = read();
        let nx = read();
        let ny = read();
        if (!abs) {
          x1 += x;
          y1 += y;
          x2 += x;
          y2 += y;
          nx += x;
          ny += y;
        }
        out.push("C");
        pushPoint(x1, y1);
        pushPoint(x2, y2);
        pushPoint(nx, ny);
        x = nx;
        y = ny;
      }
    } else if (c === "z") {
      out.push("Z");
      x = x0;
      y = y0;
    } else if (i < tokens.length && tokens[i].type === "num") {
      i++;
    }
  }
  return out.join(" ");
}

function boundsOfAbsolutePath(d) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const tokens = tokenizePath(d);
  let i = 0;
  let cmd = "";
  while (i < tokens.length) {
    if (tokens[i].type === "cmd") {
      cmd = tokens[i].value.toLowerCase();
      i++;
      if (cmd === "z") continue;
    }
    if (tokens[i]?.type !== "num") continue;
    const nums = [];
    while (i < tokens.length && tokens[i].type === "num") nums.push(tokens[i++].value);
    // M/L: pairs; C: triples of pairs — all coords are absolute x,y pairs
    for (let j = 0; j + 1 < nums.length; j += 2) {
      minX = Math.min(minX, nums[j]);
      maxX = Math.max(maxX, nums[j]);
      minY = Math.min(minY, nums[j + 1]);
      maxY = Math.max(maxY, nums[j + 1]);
    }
  }
  return { minX, maxX, minY, maxY };
}

function extractAttr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : "";
}

function extractPaths(svg) {
  const stack = [identity()];
  const paths = [];
  const tagRe = /<\/?g\b[^>]*>|<path\b[^/]*\/?>/gi;
  let match;
  while ((match = tagRe.exec(svg))) {
    const tag = match[0];
    const lower = tag.toLowerCase();
    if (lower.startsWith("</g")) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (lower.startsWith("<g")) {
      const local = parseTransform(extractAttr(tag, "transform"));
      stack.push(multiply(stack[stack.length - 1], local));
      continue;
    }
    if (lower.startsWith("<path")) {
      const d = extractAttr(tag, "d");
      const id = extractAttr(tag, "id") || `path-${paths.length}`;
      if (!d) continue;
      const matrix = stack[stack.length - 1];
      const local = parseTransform(extractAttr(tag, "transform"));
      const ctm = multiply(matrix, local);
      paths.push({ id, d: transformPath(d, ctm) });
    }
  }
  return paths;
}

let svg;
try {
  svg = readFileSync(sourcePath, "utf8");
  console.log(`Using local source ${sourcePath}`);
} catch {
  console.log(`Downloading ${sourceUrl}`);
  svg = await download(sourceUrl);
  writeFileSync(sourcePath, svg);
}

const paths = extractPaths(svg);
if (paths.length === 0) {
  throw new Error("No paths extracted from Russia SVG");
}

let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;
for (const path of paths) {
  const b = boundsOfAbsolutePath(path.d);
  minX = Math.min(minX, b.minX);
  maxX = Math.max(maxX, b.maxX);
  minY = Math.min(minY, b.minY);
  maxY = Math.max(maxY, b.maxY);
}

const pad = 16;
const output = {
  viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
  paths,
  bounds: { minX, maxX, minY, maxY },
  // Геопривязка по типичному охвату карты субъектов РФ (с Калининградом и Чукоткой справа).
  geo: { lonMin: 19.5, lonMax: 191, latMin: 41, latMax: 82 },
  attribution: {
    source: "Wikimedia Commons — Russian regional elections in 2025.svg",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Russian_regional_elections_in_2025.svg",
  },
};

writeFileSync(outPath, JSON.stringify(output));
console.log(
  `Wrote ${outPath} (${paths.length} regions, bounds ${minX.toFixed(1)}..${maxX.toFixed(1)} x ${minY.toFixed(1)}..${maxY.toFixed(1)})`,
);
