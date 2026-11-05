import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { BRAND_ACCENT, BRAND_DISPLAY_FONT, BRAND_TEXT_MUTED } from "../../theme/brandTheme";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const DURATION_MS = 1400;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function LandingStatCounter({
  value,
  prefix = "",
  suffix = "",
  label,
  delayMs = 80,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  delayMs?: number;
}) {
  const { ref, visible } = useLandingReveal<HTMLDivElement>();
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      setDisplay(Math.round(value * easeOutCubic(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, value]);

  return (
    <Box ref={ref} sx={landingRevealSx(visible, delayMs)}>
      <Typography
        sx={{
          fontFamily: BRAND_DISPLAY_FONT,
          fontWeight: 800,
          fontSize: { xs: "clamp(2.2rem, 11vw, 2.75rem)", md: "4rem" },
          letterSpacing: "-0.04em",
          color: BRAND_ACCENT,
          lineHeight: 0.95,
          fontVariantNumeric: "tabular-nums",
          wordBreak: "keep-all",
        }}
      >
        {prefix}
        {display}
        {suffix}
      </Typography>
      <Typography
        sx={{
          color: BRAND_TEXT_MUTED,
          mt: 0.75,
          maxWidth: { xs: "100%", sm: 280 },
          lineHeight: 1.45,
          fontSize: { xs: "0.95rem", md: "1rem" },
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
