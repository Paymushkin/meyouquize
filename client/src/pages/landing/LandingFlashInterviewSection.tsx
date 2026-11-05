import { useState } from "react";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { HeroVideoCameraIcon } from "./HeroFeatureCardIcons";
import { useLandingContact } from "./LandingContactDialog";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { LandingStatCounter } from "./LandingStatCounter";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const POINTS = [
  {
    title: lt("Съёмка на площадке"),
    body: lt("Команда МИЮ берёт интервью у гостей в потоке ивента - без студии и долгого монтажа."),
  },
  {
    title: lt("Сразу в вашем бренде"),
    body: lt(
      "Интро, цвета, логотип и финал ролика - под ваш ивент и спонсоров, а не чужой шаблон.",
    ),
  },
  {
    title: lt("Видео сразу готово"),
    body: lt(
      "Отдаём видео сразу гостю - уже готово к публикации в соцсети. Два формата: горизонтальный и вертикальный.",
    ),
  },
] as const;

type FlashFormat = "horizontal" | "vertical";

const FORMAT_TABS: { id: FlashFormat; label: string; src: string; aria: string }[] = [
  {
    id: "horizontal",
    label: lt("Горизонтальное"),
    src: "/flash/interview-h.mp4?v=3",
    aria: lt("Пример флеш-интервью, горизонтальный формат"),
  },
  {
    id: "vertical",
    label: lt("Вертикальное"),
    src: "/flash/interview-v.mp4?v=3",
    aria: lt("Пример флеш-интервью, вертикальный формат"),
  },
];

export function LandingFlashInterviewSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const { openContact } = useLandingContact();
  const [format, setFormat] = useState<FlashFormat>("horizontal");
  const activeFormat = FORMAT_TABS.find((tab) => tab.id === format) ?? FORMAT_TABS[0];

  return (
    <Box
      component="section"
      id="flash"
      ref={ref}
      sx={{
        position: "relative",
        bgcolor: "#000",
        py: { xs: 8, md: 12 },
        borderTop: `1px solid ${BRAND_BORDER}`,
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/event-bg.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.22,
          filter: "grayscale(0.35) contrast(1.05)",
          transform: visible ? "scale(1)" : "scale(1.04)",
          transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background: `
            linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 48%, rgba(0,0,0,0.55) 100%),
            radial-gradient(ellipse 60% 70% at 85% 40%, ${alpha(BRAND_ACCENT, 0.14)} 0%, transparent 55%)
          `,
        }}
      />

      <Container maxWidth={false} sx={{ ...LANDING_CONTAINER_SX, position: "relative" }}>
        <Stack spacing={{ xs: 4.5, md: 5 }} sx={landingRevealSx(visible)}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-end" }}
            spacing={2.5}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: BRAND_ACCENT, width: 44 }}>
                  <HeroVideoCameraIcon />
                </Box>
                <Typography
                  sx={{
                    color: BRAND_ACCENT,
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: { xs: "0.8rem", md: "0.85rem" },
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {lt("Продакшн на площадке")}
                </Typography>
              </Stack>

              <Typography
                component="h2"
                sx={{
                  fontFamily: BRAND_DISPLAY_FONT,
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  fontSize: { xs: "2.15rem", md: "3.25rem" },
                  lineHeight: 1.02,
                }}
              >
                {lt("Флеш-интервью")}
              </Typography>
            </Stack>

            <LandingStatCounter value={35} suffix="+" label={lt("видео за день")} />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
              gap: { xs: 4.5, md: 7 },
              alignItems: "center",
            }}
          >
            <Stack spacing={{ xs: 3, md: 3.5 }}>
              <Typography
                sx={{
                  color: BRAND_TEXT_MUTED,
                  fontSize: { xs: "1.05rem", md: "1.15rem" },
                  lineHeight: 1.6,
                  maxWidth: 480,
                }}
              >
                {lt(
                  "Короткие брендированные ролики с гостями - лицо аудитории и живой контент, пока ивент ещё идёт.",
                )}
              </Typography>

              <Stack spacing={0} sx={{ pt: 0.5 }}>
                {POINTS.map((point, index) => (
                  <Box
                    key={point.title}
                    sx={{
                      ...landingRevealSx(visible, 120 + index * 90),
                      py: 2,
                      borderTop: `1px solid ${BRAND_BORDER}`,
                      ...(index === POINTS.length - 1
                        ? { borderBottom: `1px solid ${BRAND_BORDER}` }
                        : {}),
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: BRAND_DISPLAY_FONT,
                        fontWeight: 700,
                        fontSize: { xs: "1.05rem", md: "1.15rem" },
                        letterSpacing: "-0.02em",
                        mb: 0.75,
                      }}
                    >
                      {point.title}
                    </Typography>
                    <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.55, maxWidth: 460 }}>
                      {point.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Button
                type="button"
                onClick={openContact}
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  mt: 1,
                  transition: "transform 220ms ease",
                  "&:hover": { transform: "translateY(-1px)" },
                }}
              >
                {lt("Обсудить съёмку")}
              </Button>
            </Stack>

            <Stack
              spacing={2}
              sx={{
                ...landingRevealSx(visible, 160),
                width: "100%",
                minWidth: 0,
              }}
            >
              <Box
                role="tablist"
                aria-label={lt("Формат видео")}
                sx={{
                  display: "inline-flex",
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  justifyContent: { xs: "stretch", sm: "flex-start" },
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: 999,
                  bgcolor: alpha("#fff", 0.06),
                  border: `1px solid ${BRAND_BORDER}`,
                }}
              >
                {FORMAT_TABS.map((tab) => {
                  const selected = tab.id === format;
                  return (
                    <Box
                      key={tab.id}
                      component="button"
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setFormat(tab.id)}
                      sx={{
                        border: 0,
                        cursor: "pointer",
                        flex: { xs: 1, sm: "0 0 auto" },
                        px: 1.75,
                        py: 0.85,
                        borderRadius: 999,
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: "center",
                        color: selected ? "#000" : alpha("#fff", 0.78),
                        bgcolor: selected ? BRAND_ACCENT : "transparent",
                        transition: "background-color 180ms ease, color 180ms ease",
                        "&:hover": {
                          color: selected ? "#000" : "#fff",
                        },
                      }}
                    >
                      {tab.label}
                    </Box>
                  );
                })}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: {
                    xs: format === "vertical" ? 360 : 200,
                    sm: format === "vertical" ? 420 : 260,
                    md: format === "vertical" ? 480 : 380,
                  },
                  border: `1px solid ${alpha(BRAND_ACCENT, 0.35)}`,
                  bgcolor: "#050505",
                  boxShadow: `0 28px 80px ${alpha("#000", 0.55)}`,
                  p: { xs: 1.25, md: 2 },
                  overflow: "hidden",
                }}
              >
                <Box
                  component="video"
                  key={activeFormat.src}
                  {...(visible ? { src: activeFormat.src } : {})}
                  autoPlay={visible}
                  muted
                  loop
                  playsInline
                  preload={visible ? "metadata" : "none"}
                  aria-label={activeFormat.aria}
                  sx={{
                    display: "block",
                    width:
                      format === "vertical"
                        ? { xs: "min(100%, 240px)", sm: "min(100%, 280px)", md: 300 }
                        : "100%",
                    maxWidth: "100%",
                    maxHeight: {
                      xs: format === "vertical" ? "min(58svh, 420px)" : 240,
                      sm: format === "vertical" ? 460 : 320,
                      md: format === "vertical" ? 520 : 420,
                    },
                    height: "auto",
                    aspectRatio: format === "vertical" ? "9 / 16" : "16 / 9",
                    objectFit: "contain",
                    borderRadius: 0,
                  }}
                />
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
