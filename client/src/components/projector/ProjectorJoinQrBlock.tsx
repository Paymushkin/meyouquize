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
        maxWidth: 1280,
        mx: "auto",
        alignItems: "center",
        justifyContent: "space-between",
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
          width: "100%",
          minWidth: 0,
          pr: { sm: 2 },
          fontSize: "clamp(1.75rem, 8cqw, 3.5rem)",
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
