import { Box, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const POINTS = [
  {
    label: lt("На площадке"),
    title: lt("Опытный специалист ведёт сервис целиком"),
    body: lt(
      "Приезжаем на ивент и берём на себя запуск, эфир и управление платформой. Вам не нужно разбираться в интерфейсе в день мероприятия.",
    ),
  },
  {
    label: lt("До ивента"),
    title: lt("Возможен чек на площадке"),
    body: lt(
      "Проверяем экран, звук, QR и сценарий заранее - чтобы в день ивента всё открылось без сюрпризов.",
    ),
  },
] as const;

export function LandingOnSiteSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();

  return (
    <Box
      component="section"
      id="onsite"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 11 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Box
          sx={{
            ...landingRevealSx(visible),
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
            gap: { xs: 4, md: 7 },
            alignItems: "start",
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 460 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: BRAND_DISPLAY_FONT,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: { xs: "2rem", md: "2.75rem" },
                lineHeight: 1.05,
              }}
            >
              {lt("Вы проводите ивент - мы ведём сервис")}
            </Typography>
          </Stack>

          <Stack spacing={0}>
            {POINTS.map((point, index) => (
              <Box
                key={point.title}
                sx={{
                  ...landingRevealSx(visible, 100 + index * 90),
                  py: { xs: 2.75, md: 3.25 },
                  borderTop: `1px solid ${BRAND_BORDER}`,
                  ...(index === POINTS.length - 1
                    ? { borderBottom: `1px solid ${BRAND_BORDER}` }
                    : {}),
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" },
                  gap: { xs: 1.25, sm: 3 },
                  alignItems: "start",
                }}
              >
                <Typography
                  sx={{
                    color: BRAND_ACCENT,
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    pt: { sm: 0.35 },
                  }}
                >
                  {point.label}
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: BRAND_DISPLAY_FONT,
                      fontWeight: 700,
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      letterSpacing: "-0.02em",
                      mb: 1,
                      lineHeight: 1.25,
                    }}
                  >
                    {point.title}
                  </Typography>
                  <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.6, maxWidth: 520 }}>
                    {point.body}
                  </Typography>
                </Box>
              </Box>
            ))}

            <Box
              sx={{
                ...landingRevealSx(visible, 280),
                mt: 3,
                px: { xs: 2.25, md: 2.75 },
                py: { xs: 2, md: 2.25 },
                borderLeft: `3px solid ${BRAND_ACCENT}`,
                bgcolor: alpha("#0a0a0a", 0.9),
                borderTop: `1px solid ${BRAND_BORDER}`,
                borderRight: `1px solid ${BRAND_BORDER}`,
                borderBottom: `1px solid ${BRAND_BORDER}`,
              }}
            >
              <Typography sx={{ lineHeight: 1.55, fontSize: { xs: "0.98rem", md: "1.05rem" } }}>
                {lt(
                  "Ваша команда фокусируется на программе и гостях - технический контур интерактивов на нас.",
                )}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
