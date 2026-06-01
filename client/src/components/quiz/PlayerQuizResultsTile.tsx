import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Stack, Typography } from "@mui/material";
import { ruBallLabel } from "@meyouquize/shared";

export type PlayerQuizResultsTileProps = {
  title: string;
  score?: number;
  brandPrimaryColor: string;
  textColor: string;
  onClick?: () => void;
  /** Админ-превью: без клика, фиксированная ширина */
  preview?: boolean;
  previewWidth?: number | string;
};

export function PlayerQuizResultsTile({
  title,
  score,
  brandPrimaryColor,
  textColor,
  onClick,
  preview = false,
  previewWidth = 128,
}: PlayerQuizResultsTileProps) {
  const displayTitle = title.trim();
  const scoreLine = typeof score === "number" ? ruBallLabel(score).toUpperCase() : null;
  const isInteractive = !preview && onClick != null;

  return (
    <Box
      component={isInteractive ? "button" : "div"}
      type={isInteractive ? "button" : undefined}
      onClick={isInteractive ? onClick : undefined}
      aria-label={
        preview
          ? undefined
          : scoreLine
            ? displayTitle
              ? `${displayTitle}, ${scoreLine}, подробнее`
              : `${scoreLine}, подробнее`
            : displayTitle
              ? `${displayTitle}, подробнее`
              : "Подробнее"
      }
      sx={{
        ...(preview
          ? {
              width: previewWidth,
              maxWidth: previewWidth,
              flexShrink: 0,
            }
          : {
              gridColumn: "span 1",
              width: "100%",
              maxWidth: "100%",
              justifySelf: "stretch",
            }),
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        position: "relative",
        border: "none",
        borderRadius: 2,
        px: "clamp(0.65rem, 2.5vw, 1rem)",
        py: "clamp(0.65rem, 2.5vw, 1rem)",
        cursor: isInteractive ? "pointer" : "default",
        textAlign: "left",
        overflow: "hidden",
        backgroundColor: brandPrimaryColor,
        color: textColor,
        boxShadow: preview ? 1 : 3,
        ...(isInteractive
          ? {
              transition: "filter 120ms ease",
              "&:hover": { filter: "brightness(0.94)" },
            }
          : {}),
      }}
    >
      <BarChartOutlinedIcon
        aria-hidden
        sx={{
          position: "absolute",
          right: "clamp(-2.5rem, -25vw, -2.75rem)",
          bottom: { xs: -2, sm: -4 },
          width: "clamp(4.5rem, 34vw, 8.5rem)",
          height: "clamp(4.5rem, 34vw, 8.5rem)",
          color: textColor,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minWidth: 0,
          pl: "clamp(0.2rem, 1.2vw, 0.45rem)",
          pr: 4,
          alignSelf: "flex-start",
        }}
      >
        {displayTitle ? (
          <Typography
            component="span"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontWeight: 700,
              fontSize: "clamp(0.5rem, 2.35vw, 0.8rem)",
              lineHeight: 1.2,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              wordBreak: "break-word",
            }}
            title={displayTitle}
          >
            {displayTitle}
          </Typography>
        ) : null}
        {scoreLine ? (
          <Typography
            component="span"
            sx={{
              display: "block",
              mt: "clamp(0.5rem, 2vw, 1rem)",
              fontWeight: 800,
              fontSize: "clamp(0.8rem, 4.8vw, 1.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            {scoreLine}
          </Typography>
        ) : null}
      </Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          position: "relative",
          zIndex: 1,
          mt: "auto",
          pt: 1,
          pl: "clamp(0.2rem, 1.2vw, 0.45rem)",
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: "clamp(0.5rem, 2vw, 0.75rem)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Подробнее
        </Typography>
        <Box
          aria-hidden
          sx={{
            width: "clamp(1.1rem, 5.5vw, 1.4rem)",
            height: "clamp(1.1rem, 5.5vw, 1.4rem)",
            borderRadius: "50%",
            border: `1.5px solid ${textColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChevronRightIcon sx={{ fontSize: "clamp(0.75rem, 3.5vw, 1rem)" }} />
        </Box>
      </Stack>
    </Box>
  );
}
