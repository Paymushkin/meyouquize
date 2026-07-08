import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ProjectorJoinQrOverlayCorner } from "@meyouquize/shared";

type Props = {
  qrDataUrl: string;
  sizePx: number;
  insetVerticalPx: number;
  insetHorizontalPx: number;
  corner: ProjectorJoinQrOverlayCorner;
};

function cornerPositionSx(
  corner: ProjectorJoinQrOverlayCorner,
  insetVerticalPx: number,
  insetHorizontalPx: number,
): SxProps<Theme> {
  switch (corner) {
    case "top_left":
      return { top: insetVerticalPx, left: insetHorizontalPx };
    case "bottom_right":
      return { bottom: insetVerticalPx, right: insetHorizontalPx };
    case "bottom_left":
      return { bottom: insetVerticalPx, left: insetHorizontalPx };
    default:
      return { top: insetVerticalPx, right: insetHorizontalPx };
  }
}

export function ProjectorJoinQrOverlay(props: Props) {
  const { qrDataUrl, sizePx, insetVerticalPx, insetHorizontalPx, corner } = props;
  return (
    <Box
      sx={{
        position: "fixed",
        zIndex: 5,
        width: sizePx,
        height: sizePx,
        boxSizing: "border-box",
        p: 1,
        bgcolor: "#fff",
        borderRadius: 1,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...cornerPositionSx(corner, insetVerticalPx, insetHorizontalPx),
      }}
    >
      <Box
        component="img"
        src={qrDataUrl}
        alt="QR-код входа в ивент"
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
}
