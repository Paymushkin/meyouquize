import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import { Box } from "@mui/material";
import {
  PHOTO_WALL_COLLAGE_GAP_PX,
  PHOTO_WALL_COLLAGE_PHOTO_COUNT,
  resolvePhotoWallCollageLayout,
} from "@meyouquize/shared";

const COLLAGE_FRAME_COLOR = "rgba(255, 255, 255, 0.92)";

type Props = {
  photoSrcs: string[];
  preview?: boolean;
  previewWidth?: number | string;
  onClick?: () => void;
};

function CollagePhoto({ src }: { src: string }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        aria-hidden
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
    </Box>
  );
}

function collageGridRow(cell: { row: number; rowSpan: number }): number | string {
  if (cell.rowSpan > 1) return `${cell.row} / ${cell.row + cell.rowSpan}`;
  return cell.row;
}

export function PlayerPhotoWallCollageTile({
  photoSrcs,
  preview = false,
  previewWidth = 100,
  onClick,
}: Props) {
  const visibleSrcs = photoSrcs.slice(0, PHOTO_WALL_COLLAGE_PHOTO_COUNT);
  const layout = resolvePhotoWallCollageLayout(visibleSrcs.length);
  const interactive = Boolean(onClick) && !preview;

  return (
    <Box
      component={interactive ? "button" : "div"}
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? "Открыть фотографии" : undefined}
      sx={{
        ...(preview
          ? {
              width: previewWidth,
              maxWidth: previewWidth,
              flexShrink: 0,
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
      {layout.kind === "single" ? (
        <Box sx={{ width: "100%", height: "100%" }}>
          {visibleSrcs[0] ? <CollagePhoto src={visibleSrcs[0]} /> : null}
        </Box>
      ) : layout.kind === "empty" ? null : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            ...(layout.rows > 1 ? { gridTemplateRows: `repeat(${layout.rows}, 1fr)` } : {}),
            gap: `${PHOTO_WALL_COLLAGE_GAP_PX}px`,
          }}
        >
          {layout.cells.map((cell) => (
            <Box
              key={cell.photoIndex}
              sx={{
                gridColumn: cell.column,
                gridRow: collageGridRow(cell),
                minHeight: 0,
                minWidth: 0,
              }}
            >
              <CollagePhoto src={visibleSrcs[cell.photoIndex]!} />
            </Box>
          ))}
        </Box>
      )}
      <PhotoLibraryOutlinedIcon
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
