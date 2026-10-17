import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import type { ReactNode } from "react";
import { HeroSmartphoneIcon, HeroVideoCameraIcon } from "./HeroFeatureCardIcons";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_HEADER_OVER_HERO_HEIGHT_PX,
  BRAND_SURFACE_BORDER_RADIUS,
  BRAND_TEXT_MUTED,
} from "../../theme/brandTheme";

const HERO_CANVAS_MAX_WIDTH = 1440;

const HERO_REQUEST_MAILTO =
  "mailto:hello@meyouquize.ru?subject=" + encodeURIComponent("Обсудить мероприятие");

const heroCardGradientFlow = keyframes`
  0%, 100% {
    transform: translate(0%, 0%) scale(1);
    opacity: 0.88;
  }
  50% {
    transform: translate(-4%, 3%) scale(1.08);
    opacity: 1;
  }
`;

const heroCardGradientHover = keyframes`
  0%, 100% {
    transform: translate(0%, 0%) scale(1.05);
    opacity: 0.95;
  }
  33% {
    transform: translate(-6%, 4%) scale(1.12);
    opacity: 1;
  }
  66% {
    transform: translate(4%, -3%) scale(1.08);
    opacity: 0.98;
  }
`;

type HeroFeatureCardProps = {
  number: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  highlighted?: boolean;
};

function HeroFeatureCard(props: HeroFeatureCardProps) {
  return (
    <Box
      component="a"
      href={props.href}
      sx={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: { xs: 2.5, md: 3 },
        p: { xs: 3.5, md: 4.5 },
        borderRadius: `${BRAND_SURFACE_BORDER_RADIUS}px`,
        border: `1px solid ${props.highlighted ? alpha(BRAND_ACCENT, 0.22) : BRAND_BORDER}`,
        bgcolor: alpha("#0a0a0a", 0.78),
        backdropFilter: "blur(12px)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease",
        overflow: "hidden",
        "&:hover": {
          borderColor: alpha(BRAND_ACCENT, props.highlighted ? 0.55 : 0.45),
          transform: "translateY(-2px)",
          boxShadow: props.highlighted
            ? `0 20px 56px ${alpha(BRAND_ACCENT, 0.24)}`
            : "0 12px 32px rgba(0,0,0,0.35)",
        },
        ...(props.highlighted
          ? {
              bgcolor: alpha("#0a0a0a", 0.84),
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: `
                  radial-gradient(ellipse 110% 130% at 92% 8%, ${alpha(BRAND_ACCENT, 0.46)} 0%, transparent 58%),
                  radial-gradient(ellipse 80% 90% at 8% 92%, ${alpha(BRAND_ACCENT, 0.14)} 0%, transparent 52%),
                  linear-gradient(145deg, ${alpha(BRAND_ACCENT, 0.16)} 0%, transparent 48%, ${alpha("#000", 0.35)} 100%)
                `,
                pointerEvents: "none",
                animation: `${heroCardGradientFlow} 6s ease-in-out infinite`,
                willChange: "transform, opacity",
                transition: "opacity 220ms ease",
              },
              "&:hover::before": {
                animation: `${heroCardGradientHover} 2.4s ease-in-out infinite`,
                background: `
                  radial-gradient(ellipse 115% 140% at 90% 4%, ${alpha(BRAND_ACCENT, 0.58)} 0%, transparent 56%),
                  radial-gradient(ellipse 85% 95% at 6% 96%, ${alpha(BRAND_ACCENT, 0.2)} 0%, transparent 50%),
                  linear-gradient(145deg, ${alpha(BRAND_ACCENT, 0.22)} 0%, transparent 42%, ${alpha("#000", 0.28)} 100%)
                `,
              },
            }
          : {}),
      }}
    >
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
          color: "text.primary",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: { xs: 40, md: 48 },
        }}
      >
        {props.icon}
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            color: BRAND_ACCENT,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.08em",
            lineHeight: 1,
            mb: 0.75,
          }}
        >
          {props.number}
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.35rem", md: "1.65rem" },
            lineHeight: 1.15,
            mb: 0.75,
          }}
        >
          {props.title}
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.55 }}>
          {props.description}
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `1px solid ${BRAND_BORDER}`,
          bgcolor: alpha("#000", 0.35),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.primary",
        }}
        aria-hidden
      >
        <ArrowForwardIcon sx={{ fontSize: 18 }} />
      </Box>
    </Box>
  );
}

export function LandingHeroSection() {
  return (
    <Box
      component="section"
      id="hero"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "#000",
      }}
    >
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          maxWidth: HERO_CANVAS_MAX_WIDTH,
          minHeight: { xs: "auto", md: "min(920px, 92vh)" },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            transform: "scale(1.02)",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 42%, rgba(0,0,0,0.28) 68%, rgba(0,0,0,0.12) 100%),
              linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.82) 100%)
            `,
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            pt: {
              xs: `${BRAND_HEADER_OVER_HERO_HEIGHT_PX + 16}px`,
              md: `${BRAND_HEADER_OVER_HERO_HEIGHT_PX + 24}px`,
            },
            pb: { xs: 4, md: 5 },
          }}
        >
          <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Stack
              spacing={{ xs: 2.5, md: 3.5 }}
              sx={{ maxWidth: 620, position: "relative", zIndex: 2 }}
            >
              <Typography
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  fontSize: { xs: "2.85rem", sm: "3.75rem", md: "5rem" },
                }}
              >
                <Box component="span" sx={{ display: "block" }}>
                  Делаем
                </Box>
                <Box component="span" sx={{ display: "block" }}>
                  мероприятие
                </Box>
                <Box component="span" sx={{ display: "block", color: BRAND_ACCENT }}>
                  ЖИВЫМ
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: BRAND_TEXT_MUTED,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                  lineHeight: 1.6,
                  maxWidth: 520,
                }}
              >
                Интерактивы для всего зала и контент с участниками — под вашим брендом и с нашей
                командой на площадке.
              </Typography>
              <Box>
                <Button
                  component="a"
                  href={HERO_REQUEST_MAILTO}
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 3.5,
                    py: 1.35,
                    fontSize: { xs: "0.95rem", md: "1rem" },
                  }}
                >
                  Обсудить мероприятие
                </Button>
              </Box>
            </Stack>
          </Box>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mt: "auto", position: "relative", zIndex: 2 }}
          >
            <HeroFeatureCard
              number="01"
              title="Интерактивы"
              description="Квизы, голосования, вопросы спикерам, реакции и розыгрыши."
              href="#demo"
              icon={<HeroSmartphoneIcon />}
              highlighted
            />
            <HeroFeatureCard
              number="02"
              title="Флеш-интервью"
              description="Короткие интервью с гостями. Брендированные ролики сразу после съёмки."
              href={HERO_REQUEST_MAILTO}
              icon={<HeroVideoCameraIcon />}
            />
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
