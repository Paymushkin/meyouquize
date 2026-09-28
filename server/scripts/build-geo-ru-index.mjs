import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import allCities from "all-the-cities";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, "..", "data");
const outPath = join(__dirname, "..", "src", "data", "geo-ru-names.json");
const ruPath = join(cacheDir, "RU.txt");
const ruZipPath = join(cacheDir, "RU.zip");

mkdirSync(cacheDir, { recursive: true });
mkdirSync(dirname(outPath), { recursive: true });

if (!existsSync(ruPath)) {
  if (!existsSync(ruZipPath)) {
    execSync("curl -sL -o RU.zip http://download.geonames.org/export/dump/alternatenames/RU.zip", {
      cwd: cacheDir,
      stdio: "inherit",
    });
  }
  execSync("unzip -o -q RU.zip", { cwd: cacheDir, stdio: "inherit" });
}

const cityIds = new Set(
  allCities.filter((city) => city.population >= 15_000).map((city) => city.cityId),
);
const index = {};

const rl = createInterface({ input: createReadStream(ruPath), crlfDelay: Infinity });
for await (const line of rl) {
  const parts = line.split("\t");
  if (parts.length < 4) continue;
  const geonameId = Number(parts[1]);
  if (!cityIds.has(geonameId)) continue;
  const lang = parts[2];
  const name = parts[3];
  if (!name || !/[\u0400-\u04FF]/.test(name)) continue;
  if (lang && lang !== "ru") continue;
  const key = String(geonameId);
  if (!index[key]) index[key] = [];
  if (!index[key].includes(name)) index[key].push(name);
}

writeFileSync(outPath, JSON.stringify(index));
console.log(`Wrote ${Object.keys(index).length} city Russian names to ${outPath}`);
