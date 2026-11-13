import { Box, Container, Typography } from "@mui/material";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_DISPLAY_FONT,
  BRAND_TEXT_MUTED,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

export function LandingBestClaimSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();

  return (
    <Box
      component="section"
      id="best"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 10, md: 14 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Box sx={landingRevealSx(visible)}>
          <Typography
            component="h2"
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.98,
              fontSize: {
                xs: "clamp(2.1rem, 9vw, 3.4rem)",
                md: "clamp(3.4rem, 6.2vw, 5.5rem)",
              },
              m: 0,
              maxWidth: { md: "18ch" },
            }}
          >
            МИ
            <Box
              component="span"
              sx={{
                color: visible ? BRAND_ACCENT : "#fff",
                transition: "color 900ms cubic-bezier(0.22, 1, 0.36, 1) 180ms",
                "@media (prefers-reduced-motion: reduce)": {
                  color: BRAND_ACCENT,
                  transition: "none",
                },
              }}
            >
              Ю
            </Box>
            {lt(" — лучший сервис для мероприятий")}
            <Box
              component="sup"
              sx={{
                fontSize: "0.35em",
                fontWeight: 700,
                letterSpacing: 0,
                ml: 0.25,
                verticalAlign: "super",
              }}
            >
              *
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: { xs: 2, md: 2.5 },
              color: BRAND_TEXT_MUTED,
              fontSize: { xs: "0.95rem", md: "1.05rem" },
              lineHeight: 1.4,
            }}
          >
            {lt("*по нашему мнению")}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
