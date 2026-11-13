import { Box, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const SCENARIOS = [
  {
    title: lt("Конференция"),
    to: "/conference",
    pain: lt("Доклады идут, а диалога с залом нет"),
    gain: lt(
      "Голосования, облако тегов и вопросы спикерам с телефона - всё сразу на большом экране",
    ),
  },
  {
    title: lt("Корпоратив"),
    to: "/corporate",
    pain: lt("Сложно удержать внимание всего зала"),
    gain: lt("Один QR - квиз, реакции и розыгрыш без приложений и регистрации"),
  },
  {
    title: lt("Экспертный / фарм-ивент"),
    to: "/pharma",
    pain: lt("Нужны модерация и измеримый отклик аудитории"),
    gain: lt("Вопросы с модерацией, точечные опросы и обратная связь по итогам сессии"),
  },
  {
    title: lt("Бренд-ивент"),
    to: "/flash-interview",
    pain: lt("После площадки почти не остаётся живого контента"),
    gain: lt("Флеш-интервью и фотостена - кадры гостей сразу в вашем визуале"),
  },
] as const;

export function LandingScenariosSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();

  return (
    <Box
      component="section"
      id="scenarios"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 11 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack spacing={{ xs: 4, md: 5 }} sx={landingRevealSx(visible)}>
          <Typography
            component="h2"
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontSize: { xs: "2rem", md: "2.75rem" },
              lineHeight: 1.05,
              maxWidth: 480,
            }}
          >
            {lt("Для кого")}
          </Typography>

          <Stack spacing={0}>
            {SCENARIOS.map((item, index) => (
              <Box
                key={item.title}
                sx={{
                  ...landingRevealSx(visible, 80 + index * 70),
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "220px 1fr 1.2fr" },
                  gap: { xs: 0.75, md: 3 },
                  alignItems: "baseline",
                  py: { xs: 2.25, md: 3 },
                  minWidth: 0,
                  borderTop: `1px solid ${BRAND_BORDER}`,
                  ...(index === SCENARIOS.length - 1
                    ? { borderBottom: `1px solid ${BRAND_BORDER}` }
                    : {}),
                }}
              >
                <MuiLink
                  component={RouterLink}
                  to={item.to}
                  underline="hover"
                  sx={{
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: { xs: "1.15rem", md: "1.25rem" },
                    color: BRAND_ACCENT,
                    textDecoration: "none",
                    width: "fit-content",
                    "&:hover": { color: BRAND_ACCENT, opacity: 0.85 },
                  }}
                >
                  {item.title}
                </MuiLink>
                <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.5 }}>
                  {item.pain}
                </Typography>
                <Typography sx={{ lineHeight: 1.5 }}>{item.gain}</Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
