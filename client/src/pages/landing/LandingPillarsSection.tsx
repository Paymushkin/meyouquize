import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { HeroSmartphoneIcon, HeroVideoCameraIcon } from "./HeroFeatureCardIcons";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const PILLARS = [
  {
    id: "interactives",
    title: "Интерактивы",
    lead: lt("Зал включается за секунды"),
    body: lt(
      "Квизы, голосования, облако тегов, вопросы спикерам, реакции и розыгрыши - с телефона гостя на большой экран.",
    ),
    href: "#proof",
    cta: lt("Как это выглядит"),
    icon: <HeroSmartphoneIcon />,
    accent: true,
  },
  {
    id: "flash",
    title: "Флеш-интервью",
    lead: lt("Контент с гостями сразу после съёмки"),
    body: lt(
      "Короткие брендированные ролики: лицо аудитории, эмоции и материал для соцсетей и отчёта спонсору.",
    ),
    href: "#flash",
    cta: lt("Смотреть формат"),
    icon: <HeroVideoCameraIcon />,
    accent: false,
  },
] as const;

export function LandingPillarsSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();

  return (
    <Box
      component="section"
      id="pillars"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 12 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack spacing={{ xs: 4, md: 6 }} sx={landingRevealSx(visible)}>
          <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: BRAND_DISPLAY_FONT,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: { xs: "2rem", md: "3rem" },
                lineHeight: 1.05,
              }}
            >
              Два столпа живого ивента
            </Typography>
            <Typography
              sx={{
                color: BRAND_TEXT_MUTED,
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.6,
              }}
            >
              {lt(
                "Платформа для зала и продакшн контента с участниками - в одном формате работы с командой на площадке.",
              )}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 2, md: 2.5 },
            }}
          >
            {PILLARS.map((pillar, index) => (
              <Box
                key={pillar.id}
                sx={{
                  ...landingRevealSx(visible, 120 + index * 100),
                  position: "relative",
                  minHeight: { xs: 280, md: 360 },
                  p: { xs: 3.5, md: 4.5 },
                  display: "flex",
                  flexDirection: "column",
                  border: `1px solid ${pillar.accent ? alpha(BRAND_ACCENT, 0.35) : BRAND_BORDER}`,
                  bgcolor: alpha("#0a0a0a", 0.9),
                  overflow: "hidden",
                  transition: "border-color 240ms ease, transform 240ms ease",
                  "&:hover": {
                    borderColor: alpha(BRAND_ACCENT, pillar.accent ? 0.7 : 0.4),
                    transform: "translateY(-2px)",
                  },
                  ...(pillar.accent
                    ? {
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          background: `radial-gradient(ellipse 90% 70% at 100% 0%, ${alpha(BRAND_ACCENT, 0.18)} 0%, transparent 55%)`,
                          pointerEvents: "none",
                        },
                      }
                    : {}),
                }}
              >
                <Box sx={{ position: "relative", color: "#fff", mb: 3, width: 48 }}>
                  {pillar.icon}
                </Box>
                <Typography
                  sx={{
                    position: "relative",
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 800,
                    fontSize: { xs: "1.75rem", md: "2.15rem" },
                    letterSpacing: "-0.03em",
                    mb: 1,
                  }}
                >
                  {pillar.title}
                </Typography>
                <Typography
                  sx={{
                    position: "relative",
                    color: pillar.accent ? BRAND_ACCENT : BRAND_TEXT_MUTED,
                    fontWeight: 600,
                    mb: 1.5,
                  }}
                >
                  {pillar.lead}
                </Typography>
                <Typography
                  sx={{
                    position: "relative",
                    color: BRAND_TEXT_MUTED,
                    lineHeight: 1.6,
                    flex: 1,
                    mb: 3,
                  }}
                >
                  {pillar.body}
                </Typography>
                <Button
                  component="a"
                  href={pillar.href}
                  variant={pillar.accent ? "contained" : "outlined"}
                  color={pillar.accent ? "primary" : "secondary"}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    position: "relative",
                    alignSelf: "flex-start",
                    ...(!pillar.accent
                      ? {
                          borderColor: "rgba(255,255,255,0.4)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#fff",
                            bgcolor: "rgba(255,255,255,0.06)",
                          },
                        }
                      : {}),
                  }}
                >
                  {pillar.cta}
                </Button>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
