import { Box } from "@mui/material";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";
import { VideoWallVideo } from "./VideoWallVideo";

type Props = {
  src: string;
  posterUrl?: string;
  /** Если нет постера — лёгкий preload видео. */
  fallbackSeekPreview?: boolean;
};

const mediaSx = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover" as const,
  objectPosition: "center",
  pointerEvents: "none" as const,
  borderRadius: 0,
};

/** Превью ячейки: картинка-постер, иначе видео. */
export function VideoWallThumb({ src, posterUrl = "", fallbackSeekPreview = false }: Props) {
  const poster = posterUrl.trim() ? resolveClientAssetUrl(posterUrl) : "";
  if (poster) {
    return (
      <Box
        component="img"
        src={poster}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden
        sx={{ ...mediaSx, bgcolor: "#111" }}
      />
    );
  }

  return (
    <VideoWallVideo
      src={src}
      muted
      playsInline
      preload={fallbackSeekPreview ? "metadata" : "none"}
      seekPreviewFrame={fallbackSeekPreview}
      aria-hidden
      sx={mediaSx}
    />
  );
}
