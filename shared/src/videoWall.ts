import {
  photoWallCollagePhotoIndices,
  resolvePhotoWallCollageLayout,
  PHOTO_WALL_COLLAGE_GAP_PX,
  PHOTO_WALL_COLLAGE_PHOTO_COUNT,
  type PhotoWallCollageLayout,
} from "./photoWall.js";

export type VideoWallOrientation = "horizontal" | "vertical";

export type VideoWallItem = {
  id: string;
  url: string;
  title: string;
};

export const VIDEO_WALL_MAX_ITEM_COUNT = 200;
export const VIDEO_WALL_PROJECTOR_MAX_VIDEOS = 40;
export const VIDEO_WALL_PROJECTOR_DEFAULT_MAX_VIDEOS = 12;
export const VIDEO_WALL_PROJECTOR_DEFAULT_ACTIVE_SECONDS = 8;
export const VIDEO_WALL_PROJECTOR_MAX_ACTIVE_SECONDS = 120;
export const VIDEO_WALL_PROJECTOR_DEFAULT_FREEZE_SECONDS = 10;
export const VIDEO_WALL_PROJECTOR_MAX_FREEZE_SECONDS = 600;
export const VIDEO_WALL_COLLAGE_VIDEO_COUNT = PHOTO_WALL_COLLAGE_PHOTO_COUNT;
export const VIDEO_WALL_COLLAGE_GAP_PX = PHOTO_WALL_COLLAGE_GAP_PX;

export function clampVideoWallProjectorMaxVideos(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return VIDEO_WALL_PROJECTOR_DEFAULT_MAX_VIDEOS;
  return Math.min(VIDEO_WALL_PROJECTOR_MAX_VIDEOS, Math.max(1, Math.round(n)));
}

export function clampVideoWallProjectorActiveSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return VIDEO_WALL_PROJECTOR_DEFAULT_ACTIVE_SECONDS;
  return Math.min(VIDEO_WALL_PROJECTOR_MAX_ACTIVE_SECONDS, Math.max(2, Math.round(n)));
}

export function clampVideoWallProjectorFreezeSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return VIDEO_WALL_PROJECTOR_DEFAULT_FREEZE_SECONDS;
  return Math.min(VIDEO_WALL_PROJECTOR_MAX_FREEZE_SECONDS, Math.max(0, Math.round(n)));
}

export type VideoWallAlbumVideo = {
  id: string;
  src: string;
  posterUrl: string;
  title: string;
  orientation: VideoWallOrientation;
  key: string;
  index: number;
};

/**
 * Yandex/S3: у части .mov в бакете неверный Content-Type —
 * response-content-type переопределяет MIME на отдаче.
 */
export function withVideoWallPlaybackContentType(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".mov") || path.endsWith(".mp4")) {
      url.searchParams.set("response-content-type", "video/mp4");
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function sanitizeVideoWallItemUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 1000);
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    return withVideoWallPlaybackContentType(trimmed);
  } catch {
    return "";
  }
}

/** Постер: HTTPS или локальный /media/... после загрузки в админке. */
export function sanitizeVideoWallPosterUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 1000);
  if (!trimmed) return "";
  if (trimmed.startsWith("/media/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return trimmed;
  } catch {
    return "";
  }
  return "";
}

export function sanitizeVideoWallItemTitle(value: unknown, fallbackIndex: number): string {
  if (typeof value === "string") {
    const title = value.trim().slice(0, 120);
    if (title) return title;
  }
  return `Видео ${fallbackIndex}`;
}

function newVideoWallItemId(): string {
  return `vw_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeVideoWallItems(value: unknown): VideoWallItem[] {
  if (!Array.isArray(value)) return [];
  const out: VideoWallItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const url = sanitizeVideoWallItemUrl(item.url);
    if (!url) continue;
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim().slice(0, 80)
        : newVideoWallItemId();
    const title = sanitizeVideoWallItemTitle(item.title, out.length + 1);
    out.push({ id, url, title });
    if (out.length >= VIDEO_WALL_MAX_ITEM_COUNT) break;
  }
  return out;
}

export function buildVideoWallAlbumVideos(
  items: readonly VideoWallItem[],
  orientation: VideoWallOrientation,
  posterUrl = "",
): VideoWallAlbumVideo[] {
  const safePoster = sanitizeVideoWallPosterUrl(posterUrl);
  return items.map((item, i) => ({
    id: item.id,
    src: item.url,
    posterUrl: safePoster,
    title: item.title,
    orientation,
    key: item.id || `${orientation}-${i + 1}`,
    index: i + 1,
  }));
}

/** Обложка плитки 1×1: отдельная картинка, иначе постеры ориентаций. */
export function resolveVideoWallTileCoverUrl(
  tileCoverUrl = "",
  horizontalPosterUrl = "",
  verticalPosterUrl = "",
): string {
  return (
    sanitizeVideoWallPosterUrl(tileCoverUrl) ||
    sanitizeVideoWallPosterUrl(horizontalPosterUrl) ||
    sanitizeVideoWallPosterUrl(verticalPosterUrl)
  );
}

/** Ролики для проектора: фильтр ориентаций + лимит (без постеров — они только у игроков). */
export function pickVideoWallProjectorVideos(input: {
  horizontalItems: readonly VideoWallItem[];
  verticalItems: readonly VideoWallItem[];
  showHorizontal?: boolean;
  showVertical?: boolean;
  maxVideos?: number;
}): VideoWallAlbumVideo[] {
  const showHorizontal = input.showHorizontal !== false;
  const showVertical = input.showVertical !== false;
  const maxVideos = clampVideoWallProjectorMaxVideos(input.maxVideos);
  const horizontal = showHorizontal
    ? buildVideoWallAlbumVideos(input.horizontalItems, "horizontal")
    : [];
  const vertical = showVertical ? buildVideoWallAlbumVideos(input.verticalItems, "vertical") : [];
  return [...horizontal, ...vertical].slice(0, maxVideos);
}

export function videoWallMimeTypeForUrl(src: string): string | undefined {
  try {
    const path = new URL(src).pathname.toLowerCase();
    if (path.endsWith(".mp4")) return "video/mp4";
    if (path.endsWith(".mov")) return "video/quicktime";
  } catch {
    const lower = src.trim().toLowerCase();
    if (lower.includes(".mp4")) return "video/mp4";
    if (lower.includes(".mov")) return "video/quicktime";
  }
  return undefined;
}

export const videoWallCollageVideoIndices = photoWallCollagePhotoIndices;
export const resolveVideoWallCollageLayout = resolvePhotoWallCollageLayout;
export type VideoWallCollageLayout = PhotoWallCollageLayout;
