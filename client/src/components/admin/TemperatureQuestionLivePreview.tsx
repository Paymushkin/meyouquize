import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { formatTemperatureScaleLabel } from "@meyouquize/shared";

export type TemperatureLivePreviewBar = {
  key: string;
  text: string;
  weight?: number;
  count: number;
};

type Props = {
  temperatureValue: number | null | undefined;
  bars: TemperatureLivePreviewBar[];
};

export function TemperatureQuestionLivePreview({ temperatureValue, bars }: Props) {
  const totalVotes = bars.reduce((sum, option) => sum + option.count, 0);
  const label = formatTemperatureScaleLabel(temperatureValue);

  return (
    <Stack spacing={0.8}>
      {label ? (
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Температура: {label}
        </Typography>
      ) : null}
      {bars.map((option) => {
        const percent = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
        return (
          <Box key={option.key} sx={{ py: 0.25 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="caption" color="text.primary">
                {option.text}
                {option.weight != null ? ` (вес ${option.weight})` : ""}
              </Typography>
              <Typography variant="caption">{option.count}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={percent}
              color="primary"
              sx={{ height: 6, borderRadius: 99 }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
