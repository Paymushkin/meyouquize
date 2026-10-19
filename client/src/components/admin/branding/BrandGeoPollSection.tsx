import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  GEO_POLL_REGION_HEAT_SCALE_OPTIONS,
  type GeoPollRegionHeatScale,
} from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

const DEFAULT_GEO_SCREEN_BG = "#111111";

type Props = {
  colorGridSx: SxProps<Theme>;
  geoPollMarkerColor: string;
  setGeoPollMarkerColor: (value: string) => void;
  geoPollRegionFillIdle: string;
  setGeoPollRegionFillIdle: (value: string) => void;
  geoPollRegionFillVoted: string;
  setGeoPollRegionFillVoted: (value: string) => void;
  geoPollRegionStrokeIdle: string;
  setGeoPollRegionStrokeIdle: (value: string) => void;
  geoPollRegionStrokeVoted: string;
  setGeoPollRegionStrokeVoted: (value: string) => void;
  geoPollRegionHeatScale: GeoPollRegionHeatScale;
  setGeoPollRegionHeatScale: (value: GeoPollRegionHeatScale) => void;
  geoPollScreenBackground: string;
  setGeoPollScreenBackground: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandGeoPollSection(props: Props) {
  const {
    colorGridSx,
    geoPollMarkerColor,
    setGeoPollMarkerColor,
    geoPollRegionFillIdle,
    setGeoPollRegionFillIdle,
    geoPollRegionFillVoted,
    setGeoPollRegionFillVoted,
    geoPollRegionStrokeIdle,
    setGeoPollRegionStrokeIdle,
    geoPollRegionStrokeVoted,
    setGeoPollRegionStrokeVoted,
    geoPollRegionHeatScale,
    setGeoPollRegionHeatScale,
    geoPollScreenBackground,
    setGeoPollScreenBackground,
    emitPatch,
  } = props;

  const isTransparent = geoPollScreenBackground === "transparent";
  const screenColorValue = isTransparent ? DEFAULT_GEO_SCREEN_BG : geoPollScreenBackground;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Геоопрос</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Фон экрана
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={isTransparent ? "transparent" : "color"}
                onChange={(_e, next) => {
                  if (next == null) return;
                  const value = next === "transparent" ? "transparent" : screenColorValue;
                  setGeoPollScreenBackground(value);
                  emitPatch({ geoPollScreenBackground: value });
                }}
              >
                <ToggleButton value="transparent" sx={{ py: 0.15, px: 1, fontSize: "0.7rem" }}>
                  Фон проектора
                </ToggleButton>
                <ToggleButton value="color" sx={{ py: 0.15, px: 1, fontSize: "0.7rem" }}>
                  Цвет
                </ToggleButton>
              </ToggleButtonGroup>
              {!isTransparent ? (
                <CompactColorField
                  label="Цвет фона"
                  value={screenColorValue}
                  onChange={setGeoPollScreenBackground}
                  onBlur={() => emitPatch({ geoPollScreenBackground })}
                />
              ) : null}
            </Stack>
          </Box>
          <Box sx={colorGridSx}>
            <CompactColorField
              label="Цвет точки"
              value={geoPollMarkerColor}
              onChange={setGeoPollMarkerColor}
              onBlur={() => emitPatch({ geoPollMarkerColor })}
            />
            <CompactColorField
              label="Заливка региона"
              value={geoPollRegionFillIdle}
              onChange={setGeoPollRegionFillIdle}
              onBlur={() => emitPatch({ geoPollRegionFillIdle })}
            />
            <CompactColorField
              label="Подсветка региона"
              value={geoPollRegionFillVoted}
              onChange={setGeoPollRegionFillVoted}
              onBlur={() => emitPatch({ geoPollRegionFillVoted })}
            />
            <CompactColorField
              label="Обводка региона"
              value={geoPollRegionStrokeIdle}
              onChange={setGeoPollRegionStrokeIdle}
              onBlur={() => emitPatch({ geoPollRegionStrokeIdle })}
            />
            <CompactColorField
              label="Обводка подсветки"
              value={geoPollRegionStrokeVoted}
              onChange={setGeoPollRegionStrokeVoted}
              onBlur={() => emitPatch({ geoPollRegionStrokeVoted })}
            />
          </Box>
          <TextField
            select
            label="Шкала интенсивности"
            value={geoPollRegionHeatScale}
            onChange={(e) => {
              const next = e.target.value as GeoPollRegionHeatScale;
              setGeoPollRegionHeatScale(next);
              emitPatch({ geoPollRegionHeatScale: next });
            }}
            size="small"
            sx={{ maxWidth: 280 }}
            helperText="Для режима интенсивности в настройках вопроса"
          >
            {GEO_POLL_REGION_HEAT_SCALE_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
