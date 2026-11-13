import { Box, Stack, Typography } from "@mui/material";
import type { PublicViewState } from "@meyouquize/shared";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { buildPlayerJoinUrl } from "../../publicAppOrigin";

type Props = {
  view: PublicViewState;
  slug: string;
};

export function ProjectorJoinQrTimelineSection({ view, slug }: Props) {
  const joinUrl = buildPlayerJoinUrl(slug);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const text = view.projectorJoinQrText?.trim() || "Сканируйте, чтобы войти";
  const textColor = view.projectorJoinQrTextColor || view.voteOptionTextColor || "#fff";

  useEffect(() => {
    if (!joinUrl) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { margin: 1, width: 520 }).then(
      (url) => {
        if (!cancelled) setQrDataUrl(url);
      },
      () => {
        if (!cancelled) setQrDataUrl("");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 2, sm: 3, md: 8 }}
      sx={{
        height: "100%",
        width: "100%",
        maxWidth: view.projectorContentMaxWidthPx || 1200,
        mx: "auto",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 3, md: 6 },
        py: { xs: 2, md: 0 },
        boxSizing: "border-box",
        overflow: "hidden",
        containerType: "size",
      }}
    >
      <Typography
        component="p"
        sx={{
          color: textColor,
          fontWeight: 700,
          textAlign: { xs: "center", md: "left" },
          whiteSpace: "pre-line",
          minWidth: 0,
          flex: { xs: "0 1 auto", md: "1 1 auto" },
          maxWidth: "100%",
          fontSize: "clamp(1.15rem, min(7cqw, 6cqh), 4.2rem)",
          lineHeight: 1.15,
          fontFamily: view.brandFontFamily,
        }}
      >
        {text}
      </Typography>
      {qrDataUrl ? (
        <Box
          component="img"
          src={qrDataUrl}
          alt="QR-код входа в ивент"
          sx={{
            width: "clamp(140px, min(48cqw, 42cqh), 480px)",
            height: "clamp(140px, min(48cqw, 42cqh), 480px)",
            maxWidth: "100%",
            borderRadius: 2,
            flexShrink: 0,
            bgcolor: "#fff",
          }}
        />
      ) : (
        <Typography sx={{ color: textColor, opacity: 0.7 }}>Готовим QR…</Typography>
      )}
    </Stack>
  );
}
