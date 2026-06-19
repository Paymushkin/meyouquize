import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { readFontLibrary } from "./font-library.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

/** Извлекает имя файла из локального URL `/media/...` или абсолютного с тем же путём. */
export function extractLocalMediaFilename(url: string | null | undefined): string | null {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return null;
  let pathname = trimmed;
  if (!pathname.startsWith("/")) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }
  const match = pathname.match(/\/media\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

function walkJsonStrings(value: unknown, visit: (value: string) => void) {
  if (typeof value === "string") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkJsonStrings(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      walkJsonStrings(nested, visit);
    }
  }
}

function addFilenameFromUrl(url: string, out: Set<string>) {
  const filename = extractLocalMediaFilename(url);
  if (filename) out.add(filename);
}

export function resolveMediaFilePath(filename: string, mediaDir = env.mediaDir): string | null {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return null;
  const resolved = path.resolve(mediaDir, safeName);
  const mediaRoot = path.resolve(mediaDir);
  if (resolved !== mediaRoot && !resolved.startsWith(`${mediaRoot}${path.sep}`)) return null;
  return resolved;
}

async function collectReferencedMediaFilenames(): Promise<Set<string>> {
  const referenced = new Set<string>();

  const [questions, options, quizzes] = await Promise.all([
    prisma.question.findMany({ select: { imageUrl: true } }),
    prisma.option.findMany({ select: { imageUrl: true } }),
    prisma.quiz.findMany({ select: { publicView: true } }),
  ]);

  for (const row of questions) addFilenameFromUrl(row.imageUrl ?? "", referenced);
  for (const row of options) addFilenameFromUrl(row.imageUrl ?? "", referenced);
  for (const row of quizzes) {
    walkJsonStrings(row.publicView as Prisma.JsonValue, (value) => {
      if (value.includes("/media/")) addFilenameFromUrl(value, referenced);
    });
  }

  for (const font of readFontLibrary(env.mediaDir)) {
    addFilenameFromUrl(font.url, referenced);
  }

  return referenced;
}

export async function collectQuestionMediaUrlsForQuiz(quizId: string): Promise<string[]> {
  const questions = await prisma.question.findMany({
    where: { quizId },
    select: {
      imageUrl: true,
      options: { select: { imageUrl: true } },
    },
  });
  const urls: string[] = [];
  for (const question of questions) {
    if (question.imageUrl) urls.push(question.imageUrl);
    for (const option of question.options) {
      if (option.imageUrl) urls.push(option.imageUrl);
    }
  }
  return urls;
}

/** Удаляет локальные файлы из `/media`, если они больше нигде не используются. */
export async function cleanupUnusedQuestionMedia(previousUrls: Iterable<string>) {
  const candidates = new Set<string>();
  for (const url of previousUrls) {
    const filename = extractLocalMediaFilename(url);
    if (filename) candidates.add(filename);
  }
  if (candidates.size === 0) return;

  const stillReferenced = await collectReferencedMediaFilenames();
  for (const filename of candidates) {
    if (stillReferenced.has(filename)) continue;
    const filePath = resolveMediaFilePath(filename);
    if (!filePath) continue;
    try {
      await fs.unlink(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code !== "ENOENT") {
        console.warn("[media-cleanup] failed to delete file", { filename, error });
      }
    }
  }
}
