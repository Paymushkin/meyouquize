import { Box } from "@mui/material";
import { useMemo } from "react";
import { buildBrandBackground } from "../../features/branding/brandVisual";

type Props = {
  backgroundColor: string;
  backgroundImageUrl?: string;
};

/** Фон игрока на весь viewport: cover, обрезка сверху, не прокручивается с контентом. */
export function PlayerViewportBackground({ backgroundColor, backgroundImageUrl }: Props) {
  const normalizedImageUrl = backgroundImageUrl?.trim() ?? "";
  const brandBg = useMemo(
    () =>
      buildBrandBackground({
        backgroundImageUrl: normalizedImageUrl || undefined,
        backgroundAnchor: "bottom",
        backgroundAttachment: "fixed",
      }),
    [normalizedImageUrl],
  );

  return (
    <Box
      key={normalizedImageUrl || "no-image"}
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundColor,
        ...brandBg,
      }}
    />
  );
}
