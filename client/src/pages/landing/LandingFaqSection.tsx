import { useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

export const FAQ_ITEMS = [
  {
    q: lt("Нужно ли участникам скачивать приложение?"),
    a: lt(
      "Нет. Гость открывает QR с телефона в браузере и сразу в игре: голосования, квиз, вопросы спикерам и остальное.",
    ),
  },
  {
    q: lt("Что вы делаете до ивента?"),
    a: lt(
      "Собираем сценарий, брендируем телефон и проектор, готовим вопросы и визуал роликов. К старту зала всё уже в ваших цветах.",
    ),
  },
  {
    q: lt("Команда МИЮ будет на площадке?"),
    a: lt(
      "Да. На ивент приезжает наш специалист и берёт на себя полное управление сервисом: запуск, эфир и сценарий интерактивов.",
    ),
  },
  {
    q: lt("Можно ли провести удалённо?"),
    a: lt(
      "Да. Специалист будет на связи и поможет с запуском, эфиром и сценарием - без выезда на площадку.",
    ),
  },
  {
    q: lt("Можно ли сделать чек до ивента?"),
    a: lt(
      "Да. По договорённости приезжаем заранее: проверяем экран, связь, QR и прогон сценария, чтобы в день мероприятия всё прошло ровно.",
    ),
  },
  {
    q: lt("Сколько стоит?"),
    a: lt(
      "Минимальная сумма - от 40 000 ₽ в день. Точная стоимость зависит от формата, сценария и состава работ.",
    ),
  },
  {
    q: lt("Чем флеш-интервью отличается от обычной съёмки?"),
    a: lt(
      "Это короткие ролики с гостями прямо на ивенте: брендированный шаблон и видео сразу после записи интервью - уже готово к публикации в соцсети, спонсорам и в отчёт.",
    ),
  },
  {
    q: lt("Можно ли полностью под наш бренд?"),
    a: lt(
      "Да. Цвета, логотип, шрифты и визуал - на телефоне гостя, на проекторе и во флеш-интервью.",
    ),
  },
  {
    q: lt("Как устроена модерация вопросов спикерам?"),
    a: lt(
      "Гости пишут с телефона, модератор отбирает вопросы и выводит их на экран. Без модерации вопросы других гостей не видны - без микрофона в проходе и хаоса в зале.",
    ),
  },
  {
    q: lt("Для каких форматов это подходит?"),
    a: lt(
      "Конференции, корпоративы, экспертные и фарм-ивенты, бренд-мероприятия - везде, где нужен живой зал и контент с гостями.",
    ),
  },
  {
    q: lt("Что остаётся после ивента?"),
    a: lt(
      "Результаты голосований и квизов, обратная связь, ролики флеш-интервью и материалы для отчёта и дальнейших коммуникаций.",
    ),
  },
] as const;

export function LandingFaqSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const [expanded, setExpanded] = useState<string | false>(FAQ_ITEMS[0].q);

  return (
    <Box
      component="section"
      id="faq"
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
            gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 0.85fr) 1.35fr" },
            gap: { xs: 3.5, md: 6 },
            alignItems: "start",
          }}
        >
          <Stack spacing={1.5} sx={{ position: { md: "sticky" }, top: { md: 96 } }}>
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
              FAQ
            </Typography>
            <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.6, maxWidth: 320 }}>
              {lt("Коротко о том, как устроены интерактивы, бренд и флеш-интервью на площадке.")}
            </Typography>
          </Stack>

          <Stack spacing={0}>
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = expanded === item.q;
              return (
                <Accordion
                  key={item.q}
                  disableGutters
                  elevation={0}
                  expanded={isOpen}
                  onChange={(_, next) => setExpanded(next ? item.q : false)}
                  sx={{
                    ...landingRevealSx(visible, 80 + index * 50),
                    bgcolor: "transparent",
                    borderTop: `1px solid ${BRAND_BORDER}`,
                    ...(index === FAQ_ITEMS.length - 1
                      ? { borderBottom: `1px solid ${BRAND_BORDER}` }
                      : {}),
                    "&::before": { display: "none" },
                    "&.Mui-expanded": { margin: 0 },
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreRoundedIcon
                        sx={{
                          color: isOpen ? BRAND_ACCENT : alpha("#fff", 0.7),
                          transition: "color 200ms ease",
                        }}
                      />
                    }
                    sx={{
                      px: { xs: 0.5, md: 1 },
                      mx: { xs: -0.5, md: -1 },
                      py: { xs: 0.5, md: 0.75 },
                      minHeight: { xs: 56, md: 64 },
                      borderRadius: 1,
                      transition: "background-color 180ms ease",
                      "& .MuiAccordionSummary-content": {
                        my: { xs: 1.1, md: 1.5 },
                        minWidth: 0,
                      },
                      "& .MuiAccordionSummary-expandIconWrapper": {
                        ml: 1,
                        flexShrink: 0,
                      },
                      "&:hover": {
                        bgcolor: alpha("#fff", 0.04),
                        "& .faq-q": { color: "#fff" },
                        "& .MuiSvgIcon-root": { color: BRAND_ACCENT },
                      },
                    }}
                  >
                    <Typography
                      className="faq-q"
                      sx={{
                        fontFamily: BRAND_DISPLAY_FONT,
                        fontWeight: 700,
                        fontSize: { xs: "1rem", md: "1.2rem" },
                        letterSpacing: "-0.02em",
                        lineHeight: 1.35,
                        pr: { xs: 1, md: 2 },
                        minWidth: 0,
                        color: isOpen ? "#fff" : alpha("#fff", 0.92),
                        transition: "color 180ms ease",
                      }}
                    >
                      {item.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                    <Typography
                      sx={{
                        color: BRAND_TEXT_MUTED,
                        lineHeight: 1.65,
                        maxWidth: 640,
                        fontSize: { xs: "0.98rem", md: "1.05rem" },
                      }}
                    >
                      {item.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
