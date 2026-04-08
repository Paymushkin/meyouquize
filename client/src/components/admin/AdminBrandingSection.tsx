import type { Dispatch, SetStateAction } from "react";
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { PublicViewSetPatch } from "../../publicViewContract";

function CompactColorField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const { label, value, onChange, onBlur } = props;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" noWrap title={label} sx={{ flex: "0 1 auto", minWidth: 0 }}>
        {label}
      </Typography>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-label={label}
        style={{
          width: 32,
          height: 26,
          padding: 0,
          border: "1px solid rgba(0,0,0,0.23)",
          borderRadius: 4,
          cursor: "pointer",
          flexShrink: 0,
          background: "transparent",
        }}
      />
    </Box>
  );
}

type Props = {
  projectorBackground: string;
  setProjectorBackground: (value: string) => void;
  voteQuestionTextColor: string;
  setVoteQuestionTextColor: (value: string) => void;
  voteOptionTextColor: string;
  setVoteOptionTextColor: (value: string) => void;
  voteProgressTrackColor: string;
  setVoteProgressTrackColor: (value: string) => void;
  voteProgressBarColor: string;
  setVoteProgressBarColor: (value: string) => void;
  cloudQuestionColor: string;
  setCloudQuestionColor: (value: string) => void;
  cloudTopTagColor: string;
  setCloudTopTagColor: (value: string) => void;
  cloudTagColors: string[];
  setCloudTagColors: Dispatch<SetStateAction<string[]>>;
  cloudDensity: number;
  setCloudDensity: (value: number) => void;
  cloudTagPadding: number;
  setCloudTagPadding: (value: number) => void;
  cloudSpiral: "archimedean" | "rectangular";
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  cloudAnimationStrength: number;
  setCloudAnimationStrength: (value: number) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
};

export function AdminBrandingSection(props: Props) {
  const {
    projectorBackground,
    setProjectorBackground,
    voteQuestionTextColor,
    setVoteQuestionTextColor,
    voteOptionTextColor,
    setVoteOptionTextColor,
    voteProgressTrackColor,
    setVoteProgressTrackColor,
    voteProgressBarColor,
    setVoteProgressBarColor,
    cloudQuestionColor,
    setCloudQuestionColor,
    cloudTopTagColor,
    setCloudTopTagColor,
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
    emitBrandingPatch,
  } = props;

  const colorGridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 1,
    alignItems: "center",
  } as const;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Брендирование
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.75 }}>
          Экран и голосование
        </Typography>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Фон проектора"
            value={projectorBackground}
            onChange={setProjectorBackground}
            onBlur={() => emitBrandingPatch({ projectorBackground })}
          />
          <CompactColorField
            label="Текст вопроса (голосование)"
            value={voteQuestionTextColor}
            onChange={setVoteQuestionTextColor}
            onBlur={() => emitBrandingPatch({ voteQuestionTextColor })}
          />
          <CompactColorField
            label="Текст ответов и %"
            value={voteOptionTextColor}
            onChange={setVoteOptionTextColor}
            onBlur={() => emitBrandingPatch({ voteOptionTextColor })}
          />
          <CompactColorField
            label="Трек столбика"
            value={voteProgressTrackColor}
            onChange={setVoteProgressTrackColor}
            onBlur={() => emitBrandingPatch({ voteProgressTrackColor })}
          />
          <CompactColorField
            label="Заполнение столбика"
            value={voteProgressBarColor}
            onChange={setVoteProgressBarColor}
            onBlur={() => emitBrandingPatch({ voteProgressBarColor })}
          />
        </Box>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.75 }}>
          Облако тегов
        </Typography>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Текст вопроса"
            value={cloudQuestionColor}
            onChange={setCloudQuestionColor}
            onBlur={() => emitBrandingPatch({ cloudQuestionColor })}
          />
          <CompactColorField
            label="Лидирующий тег"
            value={cloudTopTagColor}
            onChange={setCloudTopTagColor}
            onBlur={() => emitBrandingPatch({ cloudTopTagColor })}
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
              onBlur={() => emitBrandingPatch({ cloudTagColors })}
            />
          ))}
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2, mb: 1 }} flexWrap="wrap" useFlexGap>
          <TextField
            type="number"
            label="Плотность облака"
            value={cloudDensity}
            onChange={(e) => setCloudDensity(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            onBlur={() => emitBrandingPatch({ cloudDensity })}
            size="small"
            inputProps={{ min: 0, max: 100 }}
            sx={{ width: 160 }}
          />
          <TextField
            type="number"
            label="Отступ между тегами"
            value={cloudTagPadding}
            onChange={(e) => setCloudTagPadding(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
            onBlur={() => emitBrandingPatch({ cloudTagPadding })}
            size="small"
            inputProps={{ min: 0, max: 40 }}
            sx={{ width: 180 }}
          />
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Тип спирали"
            value={cloudSpiral}
            onChange={(e) => {
              const next = e.target.value as "archimedean" | "rectangular";
              setCloudSpiral(next);
              emitBrandingPatch({ cloudSpiral: next });
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
            onChange={(e) => setCloudAnimationStrength(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            onBlur={() => emitBrandingPatch({ cloudAnimationStrength })}
            size="small"
            inputProps={{ min: 0, max: 100 }}
            sx={{ width: 160 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
