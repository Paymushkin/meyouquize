import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Stack, SvgIcon, Typography, type SvgIconProps } from "@mui/material";
import { ruBallLabel } from "@meyouquize/shared";

/** Декоративная BarChart с более плотными столбиками (стандартная на крупном размере слишком «дырявая»). */
function CompactBarChartIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 9h4.2v11H5zm4.7-4h4.2v15h-4.2zM14.4 13h4.2v7h-4.2z" />
    </SvgIcon>
  );
}

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
  previewWidth = 100,
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
        /** cqw ниже — от ширины плитки, а не страницы */
        containerType: "inline-size",
        ...(preview
          ? {
              width: previewWidth,
              height: previewWidth,
              maxWidth: previewWidth,
              maxHeight: previewWidth,
              flexShrink: 0,
              boxSizing: "border-box",
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
        px: preview ? "0.45rem" : "clamp(0.4rem, 5cqw, 0.9rem)",
        py: preview ? "0.45rem" : "clamp(0.4rem, 5cqw, 0.9rem)",
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
      <CompactBarChartIcon
        aria-hidden
        sx={{
          position: "absolute",
          right: "clamp(-2.75rem, -24cqw, -1.1rem)",
          bottom: "clamp(-2.5rem, -22cqw, -1rem)",
          width: "clamp(3.75rem, 78cqw, 13rem)",
          height: "clamp(3.75rem, 78cqw, 13rem)",
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
          pl: "clamp(0.1rem, 1.5cqw, 0.4rem)",
          pr: "clamp(1.25rem, 18cqw, 2.5rem)",
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
              fontSize: "clamp(0.58rem, 8.5cqw, 1rem)",
              lineHeight: 1.15,
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
              mt: "clamp(0.25rem, 3.5cqw, 0.85rem)",
              fontWeight: 800,
              fontSize: "clamp(0.7rem, 11cqw, 1.35rem)",
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
        sx={{
          position: "relative",
          zIndex: 1,
          mt: "auto",
          pt: "clamp(0.25rem, 3cqw, 0.65rem)",
          pl: "clamp(0.1rem, 1.5cqw, 0.4rem)",
          gap: "clamp(0.2rem, 2.5cqw, 0.55rem)",
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: "clamp(0.55rem, 7cqw, 0.85rem)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Подробнее
        </Typography>
        <Box
          aria-hidden
          sx={{
            width: "clamp(0.85rem, 9cqw, 1.25rem)",
            height: "clamp(0.85rem, 9cqw, 1.25rem)",
            borderRadius: "50%",
            border: `1.5px solid ${textColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChevronRightIcon sx={{ fontSize: "clamp(0.6rem, 6cqw, 0.9rem)" }} />
        </Box>
      </Stack>
    </Box>
  );
}
