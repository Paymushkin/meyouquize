/** Квадратный аватар после кропа (как MUI Avatar object-fit: cover). Сжатие только на клиенте. */
export const AVATAR_EXPORT_SIZE = 512;
export const AVATAR_JPEG_QUALITY = 0.82;
/** Целевой потолок размера файла после клиентского JPEG (байты). */
export const AVATAR_MAX_UPLOAD_BYTES = 180_000;
export const AVATAR_ZOOM_MIN = 1;
export const AVATAR_ZOOM_MAX = 3;

export type AvatarCropView = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function coverScale(imageWidth: number, imageHeight: number, viewSize: number): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewSize <= 0) return 1;
  return Math.max(viewSize / imageWidth, viewSize / imageHeight);
}

/** Границы панорамы: картинка всегда закрывает квадрат превью. */
export function clampAvatarCropOffset(
  imageWidth: number,
  imageHeight: number,
  viewSize: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  const z = Math.min(AVATAR_ZOOM_MAX, Math.max(AVATAR_ZOOM_MIN, zoom));
  const scale = coverScale(imageWidth, imageHeight, viewSize) * z;
  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;
  const maxX = Math.max(0, (drawW - viewSize) / 2);
  const maxY = Math.max(0, (drawH - viewSize) / 2);
  const clampAxis = (value: number, max: number) => {
    const next = Math.min(max, Math.max(-max, value));
    return Object.is(next, -0) ? 0 : next;
  };
  return {
    offsetX: clampAxis(offsetX, maxX),
    offsetY: clampAxis(offsetY, maxY),
  };
}

export function drawAvatarCropToCanvas(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  viewSize: number,
  view: AvatarCropView,
): void {
  const zoom = Math.min(AVATAR_ZOOM_MAX, Math.max(AVATAR_ZOOM_MIN, view.zoom));
  const { offsetX, offsetY } = clampAvatarCropOffset(
    image.width,
    image.height,
    viewSize,
    zoom,
    view.offsetX,
    view.offsetY,
  );
  const scale = coverScale(image.width, image.height, viewSize) * zoom;
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const x = (viewSize - drawW) / 2 + offsetX;
  const y = (viewSize - drawH) / 2 + offsetY;
  ctx.clearRect(0, 0, viewSize, viewSize);
  ctx.drawImage(image, x, y, drawW, drawH);
}

/** Загрузка с учётом EXIF Orientation (как в профиле на экране). */
export async function loadOrientedImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fallback ниже
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      el.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Не удалось сжать фото"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Клиентское сжатие: рисуем кроп в size×size JPEG и при необходимости
 * снижаем quality, пока размер не уложится в maxBytes (без серверной обработки).
 */
export async function exportAvatarJpeg(
  image: CanvasImageSource & { width: number; height: number },
  view: AvatarCropView,
  size: number = AVATAR_EXPORT_SIZE,
  quality: number = AVATAR_JPEG_QUALITY,
  maxBytes: number = AVATAR_MAX_UPLOAD_BYTES,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  drawAvatarCropToCanvas(ctx, image, size, view);

  let q = quality;
  let blob = await canvasToJpegBlob(canvas, q);
  while (blob.size > maxBytes && q > 0.45) {
    q = Math.round((q - 0.08) * 100) / 100;
    blob = await canvasToJpegBlob(canvas, q);
  }
  if (blob.size > maxBytes && size > 320) {
    return exportAvatarJpeg(
      image,
      scaleCropView(view, size, 320),
      320,
      Math.min(q, 0.75),
      maxBytes,
    );
  }
  return blob;
}

/** Гарантия: в upload уходит JPEG с клиента (если уже наш avatar.jpg — без повторной работы). */
export async function ensureClientCompressedAvatarFile(file: File): Promise<File> {
  if (file.type === "image/jpeg" && file.size > 0 && file.size <= AVATAR_MAX_UPLOAD_BYTES) {
    return file;
  }
  const bitmap = await loadOrientedImageBitmap(file);
  try {
    const view: AvatarCropView = { zoom: 1, offsetX: 0, offsetY: 0 };
    const blob = await exportAvatarJpeg(bitmap, view);
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

/** Пересчёт смещения при смене размера превью → размер экспорта. */
export function scaleCropView(
  view: AvatarCropView,
  fromSize: number,
  toSize: number,
): AvatarCropView {
  if (fromSize <= 0 || toSize <= 0 || fromSize === toSize) return view;
  const k = toSize / fromSize;
  return {
    zoom: view.zoom,
    offsetX: view.offsetX * k,
    offsetY: view.offsetY * k,
  };
}
