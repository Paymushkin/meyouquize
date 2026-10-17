import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import { Box } from "@mui/material";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

const COLLAGE_FRAME_COLOR = "rgba(255, 255, 255, 0.92)";

type Props = {
  coverUrl: string;
  preview?: boolean;
  previewWidth?: number | string;
  onClick?: () => void;
};

/** Плитка 1×1: одна загруженная обложка, без сетки роликов. */
export function PlayerVideoWallCollageTile({
  coverUrl,
  preview = false,
  previewWidth = 100,
  onClick,
}: Props) {
  const resolved = coverUrl.trim() ? resolveClientAssetUrl(coverUrl) : "";
  const interactive = Boolean(onClick) && !preview;

  return (
    <Box
      component={interactive ? "button" : "div"}
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? "Открыть видео" : undefined}
      sx={{
        ...(preview
          ? {
              width: previewWidth,
              height: previewWidth,
              maxWidth: previewWidth,
              maxHeight: previewWidth,
              flexShrink: 0,
              boxSizing: "border-box",
            }
          : {
              gridColumn: "span 1",
              width: "100%",
              maxWidth: "100%",
              justifySelf: "stretch",
            }),
        aspectRatio: "1 / 1",
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        boxShadow: preview ? 1 : 3,
        bgcolor: COLLAGE_FRAME_COLOR,
        border: "none",
        p: 0,
        cursor: interactive ? "pointer" : "default",
        textAlign: "inherit",
      }}
    >
      {resolved ? (
        <Box
          component="img"
          src={resolved}
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden
          sx={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "center",
            pointerEvents: "none",
            bgcolor: "#111",
          }}
        />
      ) : (
        <Box sx={{ width: "100%", height: "100%", bgcolor: "#111" }} />
      )}
      <VideoLibraryOutlinedIcon
        aria-hidden
        sx={{
          position: "absolute",
          right: 8,
          bottom: 8,
          width: 18,
          height: 18,
          p: 0.8,
          borderRadius: "50%",
          bgcolor: "rgba(0, 0, 0, 0.45)",
          color: "#fff",
          boxSizing: "content-box",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}
