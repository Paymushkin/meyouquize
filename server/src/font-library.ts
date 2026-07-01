import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

export type StoredFont = {
  id: string;
  family: string;
  url: string;
  kind: "static" | "variable";
  fileName: string;
  sha256: string;
  createdAt: string;
};

type StorePayload = {
  fonts: StoredFont[];
};

function sanitizeFamily(raw: string): string {
  const trimmed = raw.trim().slice(0, 80);
  const cleaned = trimmed
    .replace(/[^a-zA-Z0-9 _-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Custom Font";
}

function storePath(mediaDir: string): string {
  return path.join(mediaDir, "fonts-registry.json");
}

function localMediaFilename(url: string): string | null {
  const match = url.match(/\/media\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

export function fontRegistryFileExists(font: StoredFont, mediaDir: string): boolean {
  const name = localMediaFilename(font.url);
  if (!name) return false;
  return fs.existsSync(path.join(mediaDir, name));
}

/** Убирает записи, у которых файл в media/ отсутствует (после сбоя деплоя и т.п.). */
export function pruneStaleFontRegistry(mediaDir: string): StoredFont[] {
  const current = readFontLibrary(mediaDir);
  const alive = current.filter((font) => fontRegistryFileExists(font, mediaDir));
  if (alive.length !== current.length) {
    writeFontLibrary(mediaDir, alive);
  }
  return alive;
}

export function readFontLibrary(mediaDir: string): StoredFont[] {
  const p = storePath(mediaDir);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as StorePayload;
    if (!parsed || !Array.isArray(parsed.fonts)) return [];
    return parsed.fonts
      .filter(
        (f) =>
          f &&
          typeof f.id === "string" &&
          typeof f.family === "string" &&
          typeof f.url === "string" &&
          typeof f.sha256 === "string",
      )
      .map(
        (f): StoredFont => ({
          id: f.id,
          family: f.family,
          url: f.url,
          kind: f.kind === "variable" ? "variable" : "static",
          fileName: typeof f.fileName === "string" ? f.fileName : "",
          sha256: f.sha256,
          createdAt: typeof f.createdAt === "string" ? f.createdAt : new Date(0).toISOString(),
        }),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writeFontLibrary(mediaDir: string, fonts: StoredFont[]) {
  const p = storePath(mediaDir);
  fs.writeFileSync(p, JSON.stringify({ fonts }, null, 2), "utf-8");
}

/** Публичный URL шрифта на текущем origin (без localhost из dev-реестра). */
export function publicFontEntry(font: StoredFont, origin: string): StoredFont {
  const name = localMediaFilename(font.url);
  if (!name) return font;
  const base = origin.replace(/\/+$/, "");
  return { ...font, url: `${base}/media/${name}` };
}

export function updateFontRegistryEntry(mediaDir: string, updated: StoredFont) {
  const fonts = readFontLibrary(mediaDir).map((font) => (font.id === updated.id ? updated : font));
  writeFontLibrary(mediaDir, fonts);
}

export function registerFont(params: {
  mediaDir: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  family: string;
  kind: "static" | "variable";
}): { font: StoredFont; duplicate: boolean; replacedFamily: boolean } {
  const { mediaDir, fileName, filePath, fileUrl, family, kind } = params;
  const bytes = fs.readFileSync(filePath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  let current = pruneStaleFontRegistry(mediaDir);
  const existing = current.find((x) => x.sha256 === sha256);
  if (existing && fontRegistryFileExists(existing, mediaDir)) {
    return { font: existing, duplicate: true, replacedFamily: false };
  }
  if (existing) {
    current = current.filter((x) => x.sha256 !== sha256);
  }

  const normalizedFamily = sanitizeFamily(family);
  const familyExisting = current.filter((x) => x.family === normalizedFamily);
  const variableForFamily = familyExisting.find((x) => x.kind === "variable");
  if (
    kind === "static" &&
    variableForFamily &&
    fontRegistryFileExists(variableForFamily, mediaDir)
  ) {
    return {
      font: variableForFamily,
      duplicate: true,
      replacedFamily: false,
    };
  }
  const next: StoredFont = {
    id: globalThis.crypto?.randomUUID?.() ?? `font_${Date.now()}`,
    family: normalizedFamily,
    url: fileUrl,
    kind,
    fileName,
    sha256,
    createdAt: new Date().toISOString(),
  };
  const filtered =
    kind === "variable" ? current.filter((x) => x.family !== normalizedFamily) : current;
  writeFontLibrary(mediaDir, [next, ...filtered]);
  return {
    font: next,
    duplicate: false,
    replacedFamily: kind === "variable" && familyExisting.length > 0,
  };
}
