import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { BrandFooter } from "./brand/BrandFooter";
import { BRAND_ACCENT, BRAND_BORDER, BRAND_SURFACE } from "../theme/brandTheme";

const FEATURES = [
  {
    title: "Живые голосования",
    description:
      "Запускайте опросы и викторины в реальном времени. Участники отвечают со смартфона, результаты появляются мгновенно.",
  },
  {
    title: "Реакции и эмоции",
    description:
      "Аудитория ставит лайки, эмодзи и реакции прямо во время выступления. Вовлечённость видна в каждом моменте.",
  },
  {
    title: "Режим спикера и проектора",
    description:
      "Отдельные виды для ведущего и большого экрана. Управляйте сценарием события без визуального шума.",
  },
  {
    title: "Отчёты по итогам",
    description:
      "Получайте полную аналитику события: ответы, реакции, лидерборды. Делитесь публичной ссылкой с участниками.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Создайте комнату",
    description:
      "Заведите событие в админке, добавьте вопросы, настройте оформление и брендинг под себя.",
  },
  {
    number: "02",
    title: "Пригласите участников",
    description:
      "Отправьте им короткую ссылку или QR-код. Никаких регистраций — открыли страницу и уже играют.",
  },
  {
    number: "03",
    title: "Проведите событие",
    description:
      "Управляйте сценарием в реальном времени, показывайте результаты на проекторе и забирайте отчёт после.",
  },
];

export function LandingPage() {
  return (
    <BrandPageLayout documentTitle="Meyouquize — интерактивные квизы и голосования для мероприятий">
      <BrandHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <BrandFooter />
    </BrandPageLayout>
  );
}

function HeroSection() {
  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        py: { xs: 8, md: 14 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: "120vw", md: "70vw" },
          height: { xs: "120vw", md: "70vw" },
          background: `radial-gradient(closest-side, rgba(253,211,42,0.18), rgba(253,211,42,0) 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack alignItems="center" textAlign="center" spacing={3}>
          <Box
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 999,
              border: `1px solid ${BRAND_BORDER}`,
              color: "text.secondary",
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Meyouquize
          </Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.4rem", sm: "3.4rem", md: "4.4rem" },
              lineHeight: 1.05,
              maxWidth: 920,
            }}
          >
            Интерактивные квизы и голосования для&nbsp;ваших&nbsp;
            <Box component="span" sx={{ color: BRAND_ACCENT }}>
              мероприятий
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              fontWeight: 400,
              maxWidth: 720,
              fontSize: { xs: "1rem", md: "1.15rem" },
            }}
          >
            Платформа для конференций, корпоративов и образовательных событий. Вовлекайте аудиторию
            в реальном времени, собирайте обратную связь и показывайте результаты на большом экране.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              component={RouterLink}
              to="/q/demo"
              variant="contained"
              color="primary"
              size="large"
            >
              Попробовать демо
            </Button>
            <Button
              component={RouterLink}
              to="/admin"
              variant="outlined"
              color="primary"
              size="large"
            >
              Войти в админку
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function FeaturesSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ mb: { xs: 5, md: 7 } }}>
          <Typography variant="overline" sx={{ color: BRAND_ACCENT, letterSpacing: "0.18em" }}>
            Возможности
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
            Всё, что нужно для живого события
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 640 }}>
            Простые инструменты для ведущих и приятный опыт для участников.
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {FEATURES.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  height: "100%",
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${BRAND_BORDER}`,
                  background: BRAND_SURFACE,
                  transition: "border-color 200ms ease, transform 200ms ease",
                  "&:hover": {
                    borderColor: BRAND_ACCENT,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function HowItWorksSection() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        borderTop: `1px solid ${BRAND_BORDER}`,
        borderBottom: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth="lg">
        <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ mb: { xs: 5, md: 7 } }}>
          <Typography variant="overline" sx={{ color: BRAND_ACCENT, letterSpacing: "0.18em" }}>
            Как это работает
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
            Запуск события за три шага
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {STEPS.map((step) => (
            <Grid key={step.number} size={{ xs: 12, md: 4 }}>
              <Stack spacing={2} sx={{ p: { xs: 2, md: 0 } }}>
                <Typography
                  sx={{
                    color: BRAND_ACCENT,
                    fontFamily: "Roboto, sans-serif",
                    fontWeight: 800,
                    fontSize: "3rem",
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {step.title}
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  {step.description}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function CtaSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 4,
            border: `1px solid ${BRAND_BORDER}`,
            background: BRAND_SURFACE,
            p: { xs: 4, md: 6 },
            textAlign: "center",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 50% 0%, rgba(253,211,42,0.16), rgba(253,211,42,0) 60%)`,
              pointerEvents: "none",
            }}
          />
          <Stack alignItems="center" spacing={3} sx={{ position: "relative" }}>
            <Typography variant="h3" sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" } }}>
              Готовы попробовать?
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 520 }}>
              Откройте демо-комнату со смартфона, чтобы почувствовать опыт участника, или войдите в
              админку и соберите своё событие.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
            >
              <Button
                component={RouterLink}
                to="/q/demo"
                variant="contained"
                color="primary"
                size="large"
              >
                Попробовать демо
              </Button>
              <Button
                component={RouterLink}
                to="/admin"
                variant="outlined"
                color="primary"
                size="large"
              >
                В админку
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
