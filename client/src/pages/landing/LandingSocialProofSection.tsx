import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, Container, IconButton, Stack, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { LandingStatCounter } from "./LandingStatCounter";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const QUOTES = [
  {
    name: "Анна К.",
    role: lt("продюсер конференции"),
    text: lt(
      "Зал ожил с первого QR. На экране - живые результаты, после - ролики с гостями, которые реально шарят.",
    ),
  },
  {
    name: "Игорь М.",
    role: lt("бренд-менеджер"),
    text: lt(
      "Важно, что всё под нашим брендом: телефон, проектор и флеш-интервью выглядят как наш ивент, не чужой софт.",
    ),
  },
  {
    name: "Елена В.",
    role: lt("директор по мероприятиям"),
    text: lt(
      "Квиз и розыгрыш собрали весь зал за минуту. Без приложений, без объяснений - просто QR на экране.",
    ),
  },
  {
    name: "Дмитрий С.",
    role: lt("организатор фарм-форума"),
    text: lt(
      "Модерация вопросов спикерам спасла сессии: зал участвует, а на экран выходит только то, что нужно.",
    ),
  },
  {
    name: "Мария П.",
    role: lt("event-менеджер"),
    text: lt(
      "Облако тегов и голосования держали внимание лучше любого спикера. Гости сами ждали следующий блок.",
    ),
  },
  {
    name: "Алексей Н.",
    role: lt("руководитель корпоративных событий"),
    text: lt(
      "Команда МИЮ была на площадке, экран и телефон - в наших цветах. Ощущение своего продакшена, а не подрядчика.",
    ),
  },
  {
    name: "Ольга Р.",
    role: lt("продюсер бренд-ивента"),
    text: lt(
      "Флеш-интервью отдали спонсорам в тот же вечер. Контент живой, в визуале бренда - сразу в отчёт и соцсети.",
    ),
  },
  {
    name: "Сергей Т.",
    role: lt("директор конференции"),
    text: lt(
      "После финала собрали обратную связь, пока гости ещё в зале. Цифры по сессиям - на следующий день, без ручных опросов.",
    ),
  },
] as const;

const AUTOPLAY_MS = 5500;
const PER_VIEW_PHONE = 1.25;
const PER_VIEW_DESKTOP = 2;

export function LandingSocialProofSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const perView = isPhone ? PER_VIEW_PHONE : PER_VIEW_DESKTOP;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = QUOTES.length;
  const maxIndex = Math.max(0, total - Math.floor(perView));
  const slideBasisPct = 100 / perView;

  const clamp = useCallback((next: number) => Math.min(maxIndex, Math.max(0, next)), [maxIndex]);

  const go = useCallback(
    (next: number) => {
      setIndex(clamp(next));
    },
    [clamp],
  );

  useEffect(() => {
    setIndex((current) => clamp(current));
  }, [clamp]);

  useEffect(() => {
    if (paused || !visible) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, maxIndex, visible]);

  return (
    <Box
      component="section"
      id="cases"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 11 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack spacing={{ xs: 4, md: 5 }} sx={landingRevealSx(visible)}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-end" }}
            spacing={2.5}
          >
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
              {lt("Говорят организаторы")}
            </Typography>

            <LandingStatCounter value={2000} suffix="+" label={lt("ивентов провели с 2015 года")} />
          </Stack>

          <Box
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            sx={{
              ...landingRevealSx(visible, 120),
              position: "relative",
            }}
          >
            <Box sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  display: "flex",
                  transition: "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                  transform: `translateX(-${index * slideBasisPct}%)`,
                }}
              >
                {QUOTES.map((quote) => (
                  <Box
                    key={quote.name}
                    sx={{
                      flex: `0 0 ${slideBasisPct}%`,
                      width: `${slideBasisPct}%`,
                      minWidth: 0,
                      boxSizing: "border-box",
                      pr: { xs: 1.25, sm: 2 },
                    }}
                  >
                    <QuoteSlide quote={quote} />
                  </Box>
                ))}
              </Box>
            </Box>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mt: 2.5, minWidth: 0 }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  minWidth: 0,
                  flex: 1,
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {QUOTES.map((quote, dotIndex) => (
                  <Box
                    key={quote.name}
                    component="button"
                    type="button"
                    aria-label={lt(`Отзыв ${dotIndex + 1}`)}
                    aria-current={dotIndex === index ? "true" : undefined}
                    onClick={() => go(dotIndex)}
                    sx={{
                      width: dotIndex === index ? 22 : 8,
                      height: 8,
                      flexShrink: 0,
                      p: 0,
                      border: 0,
                      borderRadius: 999,
                      cursor: "pointer",
                      bgcolor: dotIndex === index ? BRAND_ACCENT : alpha("#fff", 0.28),
                      transition: "width 220ms ease, background-color 220ms ease",
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <CarouselButton aria-label={lt("Предыдущий отзыв")} onClick={() => go(index - 1)}>
                  <ChevronLeftRoundedIcon />
                </CarouselButton>
                <CarouselButton aria-label={lt("Следующий отзыв")} onClick={() => go(index + 1)}>
                  <ChevronRightRoundedIcon />
                </CarouselButton>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function QuoteSlide({ quote }: { quote: (typeof QUOTES)[number] }) {
  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        minHeight: { xs: 210, md: 220 },
        bgcolor: alpha("#0a0a0a", 0.9),
        border: `1px solid ${BRAND_BORDER}`,
        borderLeft: `3px solid ${BRAND_ACCENT}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        sx={{
          fontSize: { xs: "1.05rem", md: "1.25rem" },
          lineHeight: 1.55,
          mb: 2.5,
          flex: 1,
        }}
      >
        «{quote.text}»
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{quote.name}</Typography>
      <Typography sx={{ color: BRAND_TEXT_MUTED, fontSize: 14 }}>{quote.role}</Typography>
    </Box>
  );
}

function CarouselButton({
  children,
  ...props
}: {
  children: ReactNode;
  "aria-label": string;
  onClick: () => void;
}) {
  return (
    <IconButton
      {...props}
      size="small"
      sx={{
        color: "#fff",
        border: `1px solid ${BRAND_BORDER}`,
        borderRadius: 1.5,
        "&:hover": {
          bgcolor: alpha("#fff", 0.06),
          borderColor: alpha(BRAND_ACCENT, 0.55),
        },
      }}
    >
      {children}
    </IconButton>
  );
}
