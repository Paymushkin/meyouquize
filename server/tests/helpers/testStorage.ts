import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tempRoot: string | null = null;

export function assertTestMediaDir(): void {
  const dir = process.env.MEDIA_DIR?.trim() ?? "";
  if (!dir) {
    throw new Error("Integration tests require MEDIA_DIR (set via initTestStorage)");
  }
  const tmp = os.tmpdir();
  const allowed =
    dir.startsWith(tmp) || dir.includes("meyouquize-test") || dir.includes(".test-run");
  if (!allowed) {
    throw new Error(`Refusing integration tests with MEDIA_DIR=${dir}`);
  }
}

/** Временная папка uploads; не трогает repo/media/. */
export function initTestStorage(): string {
  const runId = process.env.VITEST_WORKER_ID ?? String(process.pid);
  tempRoot = path.join(os.tmpdir(), `meyouquize-test-${runId}`);
  const mediaDir = path.join(tempRoot, "media");
  fs.mkdirSync(mediaDir, { recursive: true });
  process.env.MEDIA_DIR = mediaDir;
  assertTestMediaDir();
  return mediaDir;
}

export function cleanupTestStorage(): void {
  if (!tempRoot) return;
  fs.rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = null;
}
