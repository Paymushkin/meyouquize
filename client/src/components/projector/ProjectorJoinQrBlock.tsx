import { Box, Stack, Typography } from "@mui/material";

type Props = {
  text: string;
  textColor: string;
  qrDataUrl: string;
};

export function ProjectorJoinQrBlock(props: Props) {
  const { text, textColor, qrDataUrl } = props;
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        mt: 2,
        width: "100%",
        maxWidth: { xs: "100%", sm: 1100 },
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography
        component="p"
        sx={{
          color: textColor,
          fontWeight: 700,
          textAlign: "left",
          whiteSpace: "pre-line",
          width: "100%",
          pr: { sm: 2 },
          fontSize: "clamp(1.75rem, 4.8vw, 3.5rem)",
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
          width: "clamp(160px, 22vw, 280px)",
          height: "clamp(160px, 22vw, 280px)",
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
    </Stack>
  );
}
