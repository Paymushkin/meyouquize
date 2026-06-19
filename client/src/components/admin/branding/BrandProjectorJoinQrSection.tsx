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
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  PROJECTOR_JOIN_QR_OVERLAY_CORNERS,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  type ProjectorJoinQrOverlayCorner,
  type PublicViewSetPatch,
} from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

const CORNER_LABELS: Record<ProjectorJoinQrOverlayCorner, string> = {
  top_right: "Верхний правый",
  top_left: "Верхний левый",
  bottom_right: "Нижний правый",
  bottom_left: "Нижний левый",
};

type Props = {
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  projectorJoinQrOverlaySizePx: number;
  setProjectorJoinQrOverlaySizePx: (value: number) => void;
  projectorJoinQrOverlayInsetPx: number;
  setProjectorJoinQrOverlayInsetPx: (value: number) => void;
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
  setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandProjectorJoinQrSection(props: Props) {
  const {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
    emitPatch,
  } = props;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Проектор: QR входа</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.25}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Показывать QR-код на экране ивента
            </Typography>
            <Switch
              checked={projectorJoinQrVisible}
              onChange={(_, next) => {
                setProjectorJoinQrVisible(next);
                emitPatch({ projectorJoinQrVisible: next });
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            На экране ивента — крупный QR с текстом. На голосованиях и других экранах — компактный
            QR в углу (ведёт на вход в ивент).
          </Typography>
          <TextField
            label="Текст рядом с QR"
            placeholder={DEFAULT_PROJECTOR_JOIN_QR_TEXT}
            value={projectorJoinQrText}
            onChange={(e) => setProjectorJoinQrText(e.target.value)}
            onBlur={() => emitPatch({ projectorJoinQrText })}
            fullWidth
            size="small"
            multiline
            minRows={2}
            maxRows={5}
            inputProps={{ maxLength: PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH }}
          />
          <CompactColorField
            label="Text"
            value={projectorJoinQrTextColor}
            onChange={setProjectorJoinQrTextColor}
            onBlur={() => emitPatch({ projectorJoinQrTextColor })}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
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
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              label="Отступ от края, px"
              size="small"
              value={projectorJoinQrOverlayInsetPx}
              onChange={(e) =>
                setProjectorJoinQrOverlayInsetPx(
                  Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                )
              }
              onBlur={() => emitPatch({ projectorJoinQrOverlayInsetPx })}
              inputProps={{ min: 0, max: 200 }}
              sx={{ flex: 1 }}
            />
          </Stack>
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
            helperText={`По умолчанию: ${DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX}px, отступ ${DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX}px, верхний правый`}
          >
            {PROJECTOR_JOIN_QR_OVERLAY_CORNERS.map((corner) => (
              <MenuItem key={corner} value={corner}>
                {CORNER_LABELS[corner]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
