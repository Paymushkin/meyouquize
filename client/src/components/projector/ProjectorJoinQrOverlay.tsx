import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ProjectorJoinQrOverlayCorner } from "@meyouquize/shared";

type Props = {
  qrDataUrl: string;
  sizePx: number;
  insetPx: number;
  corner: ProjectorJoinQrOverlayCorner;
};

function cornerPositionSx(corner: ProjectorJoinQrOverlayCorner, insetPx: number): SxProps<Theme> {
  switch (corner) {
    case "top_left":
      return { top: insetPx, left: insetPx };
    case "bottom_right":
      return { bottom: insetPx, right: insetPx };
    case "bottom_left":
      return { bottom: insetPx, left: insetPx };
    default:
      return { top: insetPx, right: insetPx };
  }
}

export function ProjectorJoinQrOverlay(props: Props) {
  const { qrDataUrl, sizePx, insetPx, corner } = props;
  return (
    <Box
      component="img"
      src={qrDataUrl}
      alt="QR-код входа в ивент"
      sx={{
        position: "fixed",
        zIndex: 5,
        width: sizePx,
        height: sizePx,
        borderRadius: 1,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        pointerEvents: "none",
        ...cornerPositionSx(corner, insetPx),
      }}
    />
  );
}
