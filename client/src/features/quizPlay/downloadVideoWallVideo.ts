import type { VideoWallAlbumVideo } from "@meyouquize/shared";

export function videoWallDownloadFilename(video: VideoWallAlbumVideo): string {
  try {
    const pathname = new URL(video.src).pathname;
    const base = pathname.split("/").pop()?.trim();
    if (base) return decodeURIComponent(base);
  } catch {
    // ignore invalid URL
  }
  const safeTitle = video.title
    .trim()
    .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${safeTitle || `video-${video.index}`}.mp4`;
}

/** S3/Yandex: response-content-disposition заставляет браузер скачать, а не открыть плеер. */
export function withVideoWallDownloadContentDisposition(src: string, filename: string): string {
  try {
    const url = new URL(src);
    const safeName = filename.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "") || "video.mp4";
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return url.toString();
  } catch {
    return src;
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function triggerAttachmentUrlDownload(href: string) {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.display = "none";
  iframe.src = href;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 120_000);
}

export async function downloadVideoWallVideo(video: VideoWallAlbumVideo): Promise<void> {
  const filename = videoWallDownloadFilename(video);

  try {
    const response = await fetch(video.src, { mode: "cors" });
    if (response.ok) {
      triggerBlobDownload(await response.blob(), filename);
      return;
    }
  } catch {
    // cross-origin без CORS — ниже через Content-Disposition
  }

  triggerAttachmentUrlDownload(withVideoWallDownloadContentDisposition(video.src, filename));
}
