export type PhotoWallImageExt = "jpeg" | "jpg" | "png" | "webp";

export const PHOTO_WALL_MAX_IMAGE_COUNT = 200;
export const PHOTO_WALL_DEFAULT_IMAGE_EXT: PhotoWallImageExt = "jpeg";
export const PHOTO_WALL_PHOTO_WIDTH = 1600;
export const PHOTO_WALL_PHOTO_HEIGHT = 1200;

const EXT_SET = new Set<string>(["jpeg", "jpg", "png", "webp"]);

export function sanitizePhotoWallImageExt(value: unknown): PhotoWallImageExt {
  if (typeof value === "string") {
    const ext = value.trim().toLowerCase();
    if (EXT_SET.has(ext)) return ext as PhotoWallImageExt;
  }
  return PHOTO_WALL_DEFAULT_IMAGE_EXT;
}

export function sanitizePhotoWallBaseUrl(
  value: unknown,
  options?: { allowedHosts?: readonly string[] },
): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:") return "";
  const allowed = (options?.allowedHosts ?? [])
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length > 0) {
    const host = parsed.hostname.toLowerCase();
    if (!allowed.some((item) => host === item || host.endsWith(`.${item}`))) {
      return "";
    }
  }
  const path = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  return `${parsed.origin}${path}`;
}

export function clampPhotoWallImageCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), PHOTO_WALL_MAX_IMAGE_COUNT);
}

export function clampPhotoWallGridColumns(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), 12);
}

export type PhotoWallAlbumPhoto = {
  src: string;
  width: number;
  height: number;
  key: string;
  index: number;
};

export function buildPhotoWallImageUrl(
  baseUrl: string,
  index: number,
  ext: PhotoWallImageExt,
): string {
  const safeBase = sanitizePhotoWallBaseUrl(baseUrl);
  if (!safeBase || index < 1) return "";
  return `${safeBase}${index}.${ext}`;
}

export function buildPhotoWallAlbumPhotos(params: {
  baseUrl: string;
  count: number;
  ext?: PhotoWallImageExt;
}): PhotoWallAlbumPhoto[] {
  const ext = params.ext ?? PHOTO_WALL_DEFAULT_IMAGE_EXT;
  const safeBase = sanitizePhotoWallBaseUrl(params.baseUrl);
  const count = clampPhotoWallImageCount(params.count);
  if (!safeBase || count < 1) return [];
  const photos: PhotoWallAlbumPhoto[] = [];
  for (let index = 1; index <= count; index += 1) {
    photos.push({
      src: `${safeBase}${index}.${ext}`,
      width: PHOTO_WALL_PHOTO_WIDTH,
      height: PHOTO_WALL_PHOTO_HEIGHT,
      key: String(index),
      index,
    });
  }
  return photos;
}

export function photoWallKenBurnsVariant(index: number): number {
  return ((index - 1) % 4) + 1;
}

export const PHOTO_WALL_WATERFALL_MIN_TILES_PER_COLUMN = 12;
export const PHOTO_WALL_INSERT_INTERVAL_MS = 5_000;
export const PHOTO_WALL_INSERT_RETRY_MS = 800;
export const PHOTO_WALL_INSERT_DURATION_MS = 2_800;
export const PHOTO_WALL_COLLAGE_PHOTO_COUNT = 3;
export const PHOTO_WALL_COLLAGE_GAP_PX = 3;

export type PhotoWallCollageLayoutKind = "empty" | "single" | "pair" | "mosaic";

export type PhotoWallCollageGridCell = {
  photoIndex: number;
  column: number;
  row: number;
  rowSpan: number;
};

export type PhotoWallCollageLayout = {
  kind: PhotoWallCollageLayoutKind;
  columns: number;
  rows: number;
  cells: PhotoWallCollageGridCell[];
};

/** Раскладка коллажа на плитке участника: слева 1 фото, справа 2 (при 3+ фото). */
export function resolvePhotoWallCollageLayout(photoCount: number): PhotoWallCollageLayout {
  const count = Math.min(Math.max(0, Math.floor(photoCount)), PHOTO_WALL_COLLAGE_PHOTO_COUNT);
  if (count < 1) {
    return { kind: "empty", columns: 0, rows: 0, cells: [] };
  }
  if (count === 1) {
    return {
      kind: "single",
      columns: 1,
      rows: 1,
      cells: [{ photoIndex: 0, column: 1, row: 1, rowSpan: 1 }],
    };
  }
  if (count === 2) {
    return {
      kind: "pair",
      columns: 2,
      rows: 1,
      cells: [
        { photoIndex: 0, column: 1, row: 1, rowSpan: 1 },
        { photoIndex: 1, column: 2, row: 1, rowSpan: 1 },
      ],
    };
  }
  return {
    kind: "mosaic",
    columns: 2,
    rows: 2,
    cells: [
      { photoIndex: 0, column: 1, row: 1, rowSpan: 2 },
      { photoIndex: 1, column: 2, row: 1, rowSpan: 1 },
      { photoIndex: 2, column: 2, row: 2, rowSpan: 1 },
    ],
  };
}

export function resolvePhotoWallColumnCount(gridColumns: number, viewportWidth: number): number {
  if (gridColumns > 0) return gridColumns;
  if (viewportWidth >= 1400) return 6;
  if (viewportWidth >= 1100) return 5;
  if (viewportWidth >= 768) return 4;
  return 3;
}

export function photoWallWaterfallScrollDurationSec(
  columnIndex: number,
  columnCount: number,
): number {
  const base = 240;
  const spread = 36;
  return base + (columnIndex % columnCount) * spread;
}

export function photoWallTileAspectRatio(
  photo: Pick<PhotoWallAlbumPhoto, "width" | "height">,
): string {
  const width = photo.width > 0 ? photo.width : PHOTO_WALL_PHOTO_WIDTH;
  const height = photo.height > 0 ? photo.height : PHOTO_WALL_PHOTO_HEIGHT;
  return `${width} / ${height}`;
}

export function photoWallSlotPhotoIndex(
  photosLength: number,
  columnIndex: number,
  columnCount: number,
  slotIndex: number,
  rotationOffset: number,
): number {
  if (photosLength < 1 || columnCount < 1) return 0;

  const indices: number[] = [];
  for (let i = columnIndex; i < photosLength; i += columnCount) {
    indices.push(i);
  }
  if (indices.length === 0) {
    return (columnIndex + slotIndex + rotationOffset) % photosLength;
  }
  return indices[(slotIndex + rotationOffset) % indices.length]!;
}

export function photoWallColumnPhotoIndices(
  photosLength: number,
  columnIndex: number,
  columnCount: number,
): number[] {
  if (photosLength < 1 || columnCount < 1) return [];

  const indices: number[] = [];
  for (let i = columnIndex; i < photosLength; i += columnCount) {
    indices.push(i);
  }
  if (indices.length === 0) {
    for (let i = 0; i < photosLength; i += 1) {
      indices.push(i);
    }
  }
  return indices;
}

export function photoWallPickInsertPhotoIndex(
  photosLength: number,
  columnIndex: number,
  columnCount: number,
  forbiddenPhotoIndices: readonly number[],
  pickOffset: number,
): number | null {
  const forbidden = new Set(forbiddenPhotoIndices);
  const pool = photoWallColumnPhotoIndices(photosLength, columnIndex, columnCount);
  if (pool.length === 0) return null;

  const start = ((pickOffset % pool.length) + pool.length) % pool.length;
  for (let step = 0; step < pool.length; step += 1) {
    const candidate = pool[(start + step) % pool.length]!;
    if (!forbidden.has(candidate)) return candidate;
  }
  return null;
}

/** Индексы фото (0-based в альбоме) для коллажа на плитке участника. */
export function photoWallCollagePhotoIndices(
  photosLength: number,
  count = PHOTO_WALL_COLLAGE_PHOTO_COUNT,
): number[] {
  if (photosLength < 1 || count < 1) return [];
  const take = Math.min(count, photosLength);
  if (take === 1) return [0];

  const result: number[] = [];
  for (let i = 0; i < take; i += 1) {
    result.push(Math.round((i * (photosLength - 1)) / (take - 1)));
  }
  return result;
}

export function buildPhotoWallWaterfallColumnPhotos(
  photos: readonly PhotoWallAlbumPhoto[],
  columnIndex: number,
  columnCount: number,
  minTiles = PHOTO_WALL_WATERFALL_MIN_TILES_PER_COLUMN,
): PhotoWallAlbumPhoto[] {
  if (photos.length === 0 || columnCount < 1 || minTiles < 1) return [];
  const result: PhotoWallAlbumPhoto[] = [];
  for (let slot = 0; slot < minTiles; slot += 1) {
    const index = photoWallSlotPhotoIndex(photos.length, columnIndex, columnCount, slot, 0);
    result.push(photos[index]!);
  }
  return result;
}
