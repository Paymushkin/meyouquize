import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { animated, useSpring } from "@react-spring/web";
import {
  formatTemperatureScaleValue,
  roundTemperatureScaleValue,
  VOTE_MIN_BAR_DISPLAY_PERCENT,
  voteProgressBarFillStyle,
  voteProgressTrackBackground,
  voteFillOutlineColor,
} from "@meyouquize/shared";
import {
  TEMPERATURE_MARKER_SIZE,
  TEMPERATURE_TICK_FONT_SIZE_DESKTOP,
  TEMPERATURE_TICK_FONT_SIZE_MOBILE,
  TEMPERATURE_TICK_MARK_HEIGHT,
  TEMPERATURE_TICK_MARK_WIDTH,
  TEMPERATURE_TICK_ROW_HEIGHT,
  TEMPERATURE_TICKS_DESKTOP,
  TEMPERATURE_TICKS_MOBILE,
  TEMPERATURE_TRACK_HEIGHT,
  TEMPERATURE_VALUE_COLUMN_WIDTH,
} from "../../features/voteUi/temperatureScaleUi";

type Props = {
  subtitle?: string;
  temperatureValue: number | null | undefined;
  voteOptionTextColor?: string;
  voteProgressTrackColor?: string;
  voteProgressBarColor?: string;
};

function TemperatureTicks(props: {
  ticks: readonly number[];
  voteOptionTextColor: string;
  fontSize: { xs: string; sm: string; md: string };
  display: { xs: "block" | "none"; sm: "block" | "none" };
}) {
  const { ticks, voteOptionTextColor, fontSize, display } = props;
  return (
    <Box sx={{ position: "relative", height: TEMPERATURE_TICK_ROW_HEIGHT, display }}>
      {ticks.map((tick) => (
        <Box
          key={tick}
          sx={{
            position: "absolute",
            left: `${tick}%`,
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: TEMPERATURE_TICK_MARK_WIDTH,
              height: TEMPERATURE_TICK_MARK_HEIGHT,
              mx: "auto",
              mb: { xs: 0.5, md: 0.75 },
              borderRadius: 99,
              bgcolor: alpha(voteOptionTextColor, 0.45),
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: alpha(voteOptionTextColor, 0.75),
              fontWeight: 600,
              fontSize,
              lineHeight: 1.1,
            }}
          >
            {tick}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function ProjectorTemperatureScale(props: Props) {
  const {
    subtitle,
    temperatureValue,
    voteOptionTextColor = "#fff",
    voteProgressTrackColor = "#fff",
    voteProgressBarColor = "#1976d2",
  } = props;
  const subtitleText = subtitle?.trim() ?? "";

  const markerPercent =
    typeof temperatureValue === "number" && Number.isFinite(temperatureValue)
      ? roundTemperatureScaleValue(temperatureValue)
      : null;
  const displayPercent = markerPercent ?? 0;
  const fillPercent =
    markerPercent != null
      ? markerPercent > 0
        ? markerPercent
        : VOTE_MIN_BAR_DISPLAY_PERCENT
      : VOTE_MIN_BAR_DISPLAY_PERCENT;

  const fillSpring = useSpring({
    width: `${fillPercent}%`,
    config: { tension: 120, friction: 18 },
  });

  const barFillStyle = voteProgressBarFillStyle(voteProgressBarColor);
  const barSolidColor = voteFillOutlineColor(voteProgressBarColor);

  const markerSpring = useSpring({
    left: `${displayPercent}%`,
    opacity: 1,
    config: { tension: 120, friction: 18 },
  });

  const formattedValue = formatTemperatureScaleValue(displayPercent, { fixedDecimals: true });
  const valueLabel = (
    <Typography
      variant="h2"
      sx={{
        color: voteOptionTextColor,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
      }}
    >
      {formattedValue}
      <Typography
        component="span"
        variant="h5"
        sx={{ color: alpha(voteOptionTextColor, 0.72), ml: 0.75, fontWeight: 500 }}
      >
        / 100
      </Typography>
    </Typography>
  );

  const scaleGrid = (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: {
          xs: `minmax(0, 1fr) ${TEMPERATURE_VALUE_COLUMN_WIDTH.xs}`,
          sm: `minmax(0, 1fr) ${TEMPERATURE_VALUE_COLUMN_WIDTH.sm}`,
          md: `minmax(0, 1fr) ${TEMPERATURE_VALUE_COLUMN_WIDTH.md}`,
        },
        gridTemplateRows: "auto auto",
        columnGap: { xs: 1.5, md: 2.5 },
        rowGap: 1.5,
        alignItems: "center",
      }}
    >
      <Box sx={{ position: "relative", gridColumn: 1, gridRow: 1, minWidth: 0 }}>
        <Box
          sx={{
            position: "relative",
            height: TEMPERATURE_TRACK_HEIGHT,
            borderRadius: 99,
            bgcolor: voteProgressTrackBackground(voteProgressTrackColor),
            overflow: "hidden",
          }}
        >
          <Box
            component={animated.div}
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              borderRadius: 99,
              ...barFillStyle,
            }}
            style={{ width: fillSpring.width }}
          />
        </Box>

        <Box
          component={animated.div}
          sx={{
            position: "absolute",
            top: "50%",
            width: TEMPERATURE_MARKER_SIZE,
            height: TEMPERATURE_MARKER_SIZE,
            borderRadius: "50%",
            ...barFillStyle,
            border: { xs: "2.5px solid", md: "3px solid" },
            borderColor: voteOptionTextColor,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 0 4px ${alpha(barSolidColor, 0.25)}`,
          }}
          style={markerSpring}
        />
      </Box>

      <Box sx={{ gridColumn: 2, gridRow: 1, flexShrink: 0, overflow: "hidden" }}>{valueLabel}</Box>

      <Box sx={{ gridColumn: 1, gridRow: 2, minWidth: 0 }}>
        <TemperatureTicks
          ticks={TEMPERATURE_TICKS_DESKTOP}
          voteOptionTextColor={voteOptionTextColor}
          fontSize={TEMPERATURE_TICK_FONT_SIZE_DESKTOP}
          display={{ xs: "none", sm: "block" }}
        />
        <TemperatureTicks
          ticks={TEMPERATURE_TICKS_MOBILE}
          voteOptionTextColor={voteOptionTextColor}
          fontSize={TEMPERATURE_TICK_FONT_SIZE_MOBILE}
          display={{ xs: "block", sm: "none" }}
        />
      </Box>
    </Box>
  );

  return (
    <Stack
      spacing={0.75}
      sx={{
        width: "100%",
        py: { xs: 2, md: 3 },
        px: { xs: 0.5, md: 1 },
      }}
    >
      {subtitleText ? (
        <Typography
          variant="h5"
          align="left"
          sx={{
            color: alpha(voteOptionTextColor, 0.82),
            fontWeight: 500,
            lineHeight: 1.25,
            mb: 0,
          }}
        >
          {subtitleText}
        </Typography>
      ) : null}
      {scaleGrid}
    </Stack>
  );
}
