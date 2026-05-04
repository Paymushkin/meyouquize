import fs from "node:fs";
import path from "node:path";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function getP95(summary) {
  return summary?.metrics?.http_req_duration?.values?.["p(95)"] ?? null;
}

function getErrorRate(summary) {
  return summary?.metrics?.http_req_failed?.values?.rate ?? null;
}

function formatNum(v, digits = 2) {
  return typeof v === "number" ? v.toFixed(digits) : "n/a";
}

const beforeDir = process.argv[2];
const afterDir = process.argv[3];

if (!beforeDir || !afterDir) {
  console.error("Usage: node load/compare-results.mjs <before_run_dir> <after_run_dir>");
  process.exit(1);
}

const beforeK6 = path.join(beforeDir, "k6-summary.json");
const afterK6 = path.join(afterDir, "k6-summary.json");

if (!fs.existsSync(beforeK6) || !fs.existsSync(afterK6)) {
  console.error("k6-summary.json not found in one of the run directories");
  process.exit(1);
}

const before = readJson(beforeK6);
const after = readJson(afterK6);

const beforeP95 = getP95(before);
const afterP95 = getP95(after);
const beforeErr = getErrorRate(before);
const afterErr = getErrorRate(after);

console.log("Load tuning comparison");
console.log(`before p95: ${formatNum(beforeP95)} ms`);
console.log(`after  p95: ${formatNum(afterP95)} ms`);
if (typeof beforeP95 === "number" && typeof afterP95 === "number") {
  console.log(`delta p95: ${formatNum(afterP95 - beforeP95)} ms`);
}
console.log(`before error rate: ${formatNum(beforeErr, 4)}`);
console.log(`after  error rate: ${formatNum(afterErr, 4)}`);
if (typeof beforeErr === "number" && typeof afterErr === "number") {
  console.log(`delta error rate: ${formatNum(afterErr - beforeErr, 4)}`);
}
