import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  colorGridSx: SxProps<Theme>;
  cloudQuestionColor: string;
  setCloudQuestionColor: (value: string) => void;
  cloudTopTagColor: string;
  setCloudTopTagColor: (value: string) => void;
  cloudCorrectTagColor: string;
  setCloudCorrectTagColor: (value: string) => void;
  cloudTagColors: string[];
  setCloudTagColors: (value: string[]) => void;
  cloudDensity: number;
  setCloudDensity: (value: number) => void;
  cloudTagPadding: number;
  setCloudTagPadding: (value: number) => void;
  cloudSpiral: "archimedean" | "rectangular";
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  cloudAnimationStrength: number;
  setCloudAnimationStrength: (value: number) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandTagCloudSection(props: Props) {
  const {
    colorGridSx,
    cloudQuestionColor,
    setCloudQuestionColor,
    cloudTopTagColor,
    setCloudTopTagColor,
    cloudCorrectTagColor,
    setCloudCorrectTagColor,
    cloudTagColors,
    setCloudTagColors,
    cloudDensity,
    setCloudDensity,
    cloudTagPadding,
    setCloudTagPadding,
    cloudSpiral,
    setCloudSpiral,
    cloudAnimationStrength,
    setCloudAnimationStrength,
    emitPatch,
  } = props;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Облако тегов</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Box sx={colorGridSx}>
            <CompactColorField
              label="Текст вопроса"
              value={cloudQuestionColor}
              onChange={setCloudQuestionColor}
              onBlur={() => emitPatch({ cloudQuestionColor })}
            />
            <CompactColorField
              label="Лидирующий тег"
              value={cloudTopTagColor}
              onChange={setCloudTopTagColor}
              onBlur={() => emitPatch({ cloudTopTagColor })}
            />
            <CompactColorField
              label="Эталонный тег (квиз)"
              value={cloudCorrectTagColor}
              onChange={setCloudCorrectTagColor}
              onBlur={() => emitPatch({ cloudCorrectTagColor })}
            />
            {cloudTagColors.map((color, idx) => (
              <CompactColorField
                key={`tag-color-${idx}`}
                label={`Тег ${idx + 1}`}
                value={color}
                onChange={(v) => {
                  const next = [...cloudTagColors];
                  next[idx] = v;
                  setCloudTagColors(next);
                }}
                onBlur={() => emitPatch({ cloudTagColors })}
              />
            ))}
          </Box>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <TextField
              type="number"
              label="Плотность облака"
              value={cloudDensity}
              onChange={(e) =>
                setCloudDensity(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
              }
              onBlur={() => emitPatch({ cloudDensity })}
              size="small"
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 160 }}
            />
            <TextField
              type="number"
              label="Отступ между тегами"
              value={cloudTagPadding}
              onChange={(e) =>
                setCloudTagPadding(Math.max(0, Math.min(40, Number(e.target.value) || 0)))
              }
              onBlur={() => emitPatch({ cloudTagPadding })}
              size="small"
              inputProps={{ min: 0, max: 40 }}
              sx={{ width: 180 }}
            />
            <TextField
              select
              label="Тип спирали"
              value={cloudSpiral}
              onChange={(e) => {
                const next = e.target.value as "archimedean" | "rectangular";
                setCloudSpiral(next);
                emitPatch({ cloudSpiral: next });
              }}
              size="small"
              sx={{ width: 200 }}
            >
              <MenuItem value="archimedean">archimedean</MenuItem>
              <MenuItem value="rectangular">rectangular</MenuItem>
            </TextField>
            <TextField
              type="number"
              label="Сила анимации"
              value={cloudAnimationStrength}
              onChange={(e) =>
                setCloudAnimationStrength(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
              }
              onBlur={() => emitPatch({ cloudAnimationStrength })}
              size="small"
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 160 }}
            />
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
