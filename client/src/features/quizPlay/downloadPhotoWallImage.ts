import type { PhotoWallAlbumPhoto } from "@meyouquize/shared";

export function photoWallDownloadFilename(photo: PhotoWallAlbumPhoto): string {
  try {
    const pathname = new URL(photo.src).pathname;
    const base = pathname.split("/").pop()?.trim();
    if (base) return base;
  } catch {
    // ignore invalid URL
  }
  return `photo-${photo.index}.jpg`;
}

export async function downloadPhotoWallImage(photo: PhotoWallAlbumPhoto): Promise<void> {
  const filename = photoWallDownloadFilename(photo);
  try {
    const response = await fetch(photo.src, { mode: "cors" });
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(photo.src, "_blank", "noopener,noreferrer");
  }
}
