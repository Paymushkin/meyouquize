import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  PROJECTOR_JOIN_QR_OVERLAY_CORNERS,
  type ProjectorJoinQrOverlayCorner,
  type PublicViewSetPatch,
} from "../../../publicViewContract";

const CORNER_LABELS: Record<ProjectorJoinQrOverlayCorner, string> = {
  top_right: "Верхний правый",
  top_left: "Верхний левый",
  bottom_right: "Нижний правый",
  bottom_left: "Нижний левый",
};

type Props = {
  projectorJoinQrOverlayVisible: boolean;
  setProjectorJoinQrOverlayVisible: (value: boolean) => void;
  projectorJoinQrOverlaySizePx: number;
  setProjectorJoinQrOverlaySizePx: (value: number) => void;
  projectorJoinQrOverlayInsetVerticalPx: number;
  setProjectorJoinQrOverlayInsetVerticalPx: (value: number) => void;
  projectorJoinQrOverlayInsetHorizontalPx: number;
  setProjectorJoinQrOverlayInsetHorizontalPx: (value: number) => void;
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
  setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandProjectorJoinQrSection(props: Props) {
  const {
    projectorJoinQrOverlayVisible,
    setProjectorJoinQrOverlayVisible,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetVerticalPx,
    setProjectorJoinQrOverlayInsetVerticalPx,
    projectorJoinQrOverlayInsetHorizontalPx,
    setProjectorJoinQrOverlayInsetHorizontalPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
    emitPatch,
  } = props;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Проектор: компактный QR</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.25}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Показывать QR в углу экрана
            </Typography>
            <Switch
              checked={projectorJoinQrOverlayVisible}
              onChange={(_, next) => {
                setProjectorJoinQrOverlayVisible(next);
                emitPatch({ projectorJoinQrOverlayVisible: next });
              }}
            />
          </Box>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <TextField
              type="number"
              label="Размер QR, px"
              size="small"
              value={projectorJoinQrOverlaySizePx}
              onChange={(e) =>
                setProjectorJoinQrOverlaySizePx(
                  Math.max(48, Math.trunc(Number(e.target.value) || 0)),
                )
              }
              onBlur={() => emitPatch({ projectorJoinQrOverlaySizePx })}
              inputProps={{ min: 48, max: 480 }}
              sx={{ flex: "1 1 110px", minWidth: 110 }}
            />
            <TextField
              select
              label="Угол экрана"
              size="small"
              value={projectorJoinQrOverlayCorner}
              onChange={(e) => {
                const next = e.target.value as ProjectorJoinQrOverlayCorner;
                setProjectorJoinQrOverlayCorner(next);
                emitPatch({ projectorJoinQrOverlayCorner: next });
              }}
              sx={{ flex: "2 1 160px", minWidth: 160 }}
            >
              {PROJECTOR_JOIN_QR_OVERLAY_CORNERS.map((corner) => (
                <MenuItem key={corner} value={corner}>
                  {CORNER_LABELS[corner]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Сверху/снизу, px"
              size="small"
              value={projectorJoinQrOverlayInsetVerticalPx}
              onChange={(e) =>
                setProjectorJoinQrOverlayInsetVerticalPx(
                  Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                )
              }
              onBlur={() => emitPatch({ projectorJoinQrOverlayInsetVerticalPx })}
              inputProps={{ min: 0, max: 200 }}
              sx={{ flex: "1 1 110px", minWidth: 110 }}
            />
            <TextField
              type="number"
              label="Слева/справа, px"
              size="small"
              value={projectorJoinQrOverlayInsetHorizontalPx}
              onChange={(e) =>
                setProjectorJoinQrOverlayInsetHorizontalPx(
                  Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                )
              }
              onBlur={() => emitPatch({ projectorJoinQrOverlayInsetHorizontalPx })}
              inputProps={{ min: 0, max: 200 }}
              sx={{ flex: "1 1 110px", minWidth: 110 }}
            />
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
