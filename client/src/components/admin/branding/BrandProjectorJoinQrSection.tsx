import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  type PublicViewSetPatch,
} from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
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
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
