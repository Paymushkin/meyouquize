import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalTeardown() {
  execSync("npx tsx e2e/scripts/run-teardown.ts", {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
}
