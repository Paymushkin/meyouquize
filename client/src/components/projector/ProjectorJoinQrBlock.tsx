import { Box, Stack, Typography } from "@mui/material";

type Props = {
  text: string;
  textColor: string;
  qrDataUrl: string;
  /** Макс. ширина контейнера проектора (из настроек ивента). */
  maxWidthPx: number;
};

export function ProjectorJoinQrBlock(props: Props) {
  const { text, textColor, qrDataUrl, maxWidthPx } = props;
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 8, sm: 24 }}
      sx={{
        mt: 2,
        width: "100%",
        maxWidth: maxWidthPx,
        mx: "auto",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        containerType: "inline-size",
      }}
    >
      <Typography
        component="p"
        sx={{
          color: textColor,
          fontWeight: 700,
          textAlign: "left",
          whiteSpace: "pre-line",
          width: "auto",
          minWidth: 0,
          flex: "0 1 auto",
          fontSize: "clamp(2rem, 9.5cqw, 4rem)",
          lineHeight: 1.15,
        }}
      >
        {text}
      </Typography>
      <Box
        component="img"
        src={qrDataUrl}
        alt="QR-код входа в ивент"
        sx={{
          width: "clamp(160px, 36cqw, 420px)",
          height: "clamp(160px, 36cqw, 420px)",
          maxWidth: "100%",
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
    </Stack>
  );
}
