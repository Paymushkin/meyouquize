import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import SentimentSatisfiedAltOutlinedIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { Box, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ProjectorLeaderboardTable } from "../../components/projector/ProjectorLeaderboardTable";
import { QuestionChart } from "../../components/projector/QuestionChart";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import type { ProjectorLeader, ProjectorQuestionResult } from "../../types/projectorDashboard";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

type ProofTabId = "poll" | "quiz" | "tags" | "speaker" | "feedback" | "all";

const TABS: { id: ProofTabId; label: string; title: string; lead: string }[] = [
  {
    id: "poll",
    label: "Опрос",
    title: "Гость ответил - зал увидел",
    lead: "Один сценарий: телефон в руке, результат на большом экране. Без приложений и задержек.",
  },
  {
    id: "quiz",
    label: "Квиз",
    title: "Правильный ответ - очки в таблице",
    lead: "Участники отвечают с телефона, на экране зала сразу обновляется турнирная таблица.",
  },
  {
    id: "tags",
    label: "Облако тегов",
    title: "Слова зала - на большом экране",
    lead: "Гости пишут ассоциации с телефона, облако собирается в реальном времени перед всей аудиторией.",
  },
  {
    id: "speaker",
    label: "Вопросы спикеру",
    title: "Вопрос из зала - сразу на экране",
    lead: "Участники задают вопросы со смартфона, спикер видит их на проекторе без микрофона и очередей.",
  },
  {
    id: "feedback",
    label: "Обратная связь",
    title: "Оценка ивента - пока гости ещё здесь",
    lead: "Соберите оценки и комментарии в зале: сводка появляется на экране сразу после отправки.",
  },
  {
    id: "all",
    label: "Все возможности",
    title: "Всё, что умеем на площадке",
    lead: "Интерактивы, голос зала, энергия и контент - в одном формате под ваш бренд.",
  },
];

const ALL_CAPABILITY_BLOCKS: {
  title: string;
  icon: ReactNode;
  items: string[];
}[] = [
  {
    title: lt("Голосования"),
    icon: <HowToVoteOutlinedIcon />,
    items: [
      lt("Классическое - один ответ, живые проценты на экране"),
      lt("Несколько вариантов - мультивыбор с телефона гостя"),
      lt("Ранжирование - расставьте варианты по приоритету"),
      lt("Облако тегов - слова зала собираются в реальном времени"),
      lt("Дебаты - сравнение мнений «до» и «после»"),
      lt("Гео-вопрос - ответы на карте"),
      lt("Обратная связь - оценки по итогам сессии или всего ивента"),
    ],
  },
  {
    title: lt("Квизы"),
    icon: <EmojiEventsOutlinedIcon />,
    items: [
      lt("Один и несколько правильных ответов"),
      lt("Баллы, тай-брейк по скорости и турнирная таблица"),
      lt("Сабквизы и сценарии под блоки программы"),
      lt("Результаты сразу на большом экране"),
    ],
  },
  {
    title: lt("Вопросы спикерам"),
    icon: <ForumOutlinedIcon />,
    items: [
      lt("Гость пишет вопрос с телефона без микрофона и очередей"),
      lt("Модерация и вывод на проектор"),
      lt("Автор, реакции и адресат на экране зала"),
      lt("Разделение по сессиям и блокам программы"),
      lt("Отдельная страница для модератора"),
    ],
  },
  {
    title: lt("Рандомайзер"),
    icon: <CasinoOutlinedIcon />,
    items: [
      lt("Честный розыгрыш среди участников в зале"),
      lt("Анимация выбора победителя на проекторе"),
      lt("Подходит для подарков, спонсорских призов и финала"),
    ],
  },
  {
    title: lt("Реакции"),
    icon: <SentimentSatisfiedAltOutlinedIcon />,
    items: [lt("Живой поток реакций на большом экране"), lt("Мгновенная обратная связь без слов")],
  },
  {
    title: lt("Фото, видео, документы"),
    icon: <FolderSpecialOutlinedIcon />,
    items: [
      lt("Фотостена с кадрами гостей на проекторе"),
      lt("Видеостена для роликов и анонсов"),
      lt("Документы и материалы под рукой у команды"),
    ],
  },
  {
    title: lt("Флеш-интервью"),
    icon: <VideocamOutlinedIcon />,
    items: [
      lt("Короткие интервью с гостями на площадке"),
      lt("Брендированные ролики сразу после съёмки"),
      lt("Контент для соцсетей, отчёта и спонсоров"),
    ],
  },
  {
    title: lt("Нетворкинг"),
    icon: <GroupsOutlinedIcon />,
    items: [lt("Профиль гостя: кто я, чем полезен, что ищу"), lt("Отображение профиля на экране")],
  },
  {
    title: lt("Полное брендирование"),
    icon: <BrushOutlinedIcon />,
    items: [
      lt("Цвета, логотип и визуал на телефоне и проекторе"),
      lt("Свои шрифты под бренд мероприятия"),
    ],
  },
];

const POLL_BARS = [
  { label: lt("Ничего не сдерживает, уже внедряем"), pct: 41 },
  { label: lt("Непонятно, с чего начать"), pct: 28 },
  { label: lt("Высокий капекс и долгая окупаемость"), pct: 21 },
  { label: lt("В нашей отрасли роботы не справятся"), pct: 10 },
] as const;

const QUIZ_PHONE_SHOTS = [
  "/proof/quiz-1.webp",
  "/proof/quiz-2.webp",
  "/proof/quiz-3.webp",
  "/proof/quiz-4.webp",
  "/proof/quiz-5.webp",
  "/proof/quiz-6.webp",
] as const;

const QUIZ_LEADERS: ProjectorLeader[] = [
  { participantId: "1", nickname: "Анна К.", score: 120, totalResponseMs: 42_350 },
  { participantId: "2", nickname: "Игорь М.", score: 110, totalResponseMs: 48_120 },
  { participantId: "3", nickname: "Мария С.", score: 95, totalResponseMs: 51_800 },
  { participantId: "4", nickname: "Денис П.", score: 80, totalResponseMs: 56_400 },
  { participantId: "5", nickname: "Ольга В.", score: 70, totalResponseMs: 61_050 },
];

const QUIZ_PHONE_ROTATE_MS = 2200;

const TAG_CLOUD_QUESTION: ProjectorQuestionResult = {
  questionId: "landing-tag-cloud",
  text: lt("Что главное на ивенте?"),
  type: "tag_cloud",
  optionStats: [],
  tagCloud: [
    { text: "скорость", count: 28 },
    { text: "вовлечение", count: 22 },
    { text: "эмоции", count: 14 },
    { text: "бренд", count: 24 },
    { text: "зал", count: 10 },
    { text: "контент", count: 18 },
    { text: "QR", count: 12 },
    { text: "живой", count: 26 },
    { text: "команда", count: 9 },
    { text: "энергия", count: 16 },
  ],
};

const TAG_CLOUD_COLORS = ["#ffffff", "#e8e8e8", "#cfcfcf", "#b8b8b8", BRAND_ACCENT];

const SPEAKER_QUESTIONS = [
  {
    text: lt("Как измерить эффект от внедрения?"),
    author: "Анна К.",
    reactions: [
      { emoji: "🔥", count: 12 },
      { emoji: "👍", count: 8 },
    ],
  },
  {
    text: lt("Какой срок пилота вы рекомендуете?"),
    author: "Игорь М.",
    reactions: [{ emoji: "👍", count: 6 }],
  },
  {
    text: lt("Что делать с сопротивлением команды?"),
    author: "Мария С.",
    reactions: [
      { emoji: "👏", count: 9 },
      { emoji: "🔥", count: 4 },
    ],
  },
] as const;

const FEEDBACK_SCORES = [
  { label: "5", pct: 48 },
  { label: "4", pct: 31 },
  { label: "3", pct: 14 },
  { label: "2", pct: 5 },
  { label: "1", pct: 2 },
] as const;

function PhoneBezel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: "100%",
        p: { xs: "2px", md: "3px" },
        borderRadius: { xs: "18px", sm: "24px", md: "34px" },
        background: "linear-gradient(145deg, #3a3a3a 0%, #111 42%, #2c2c2c 100%)",
        boxShadow: {
          xs: `
            0 0 0 1px rgba(255,255,255,0.16),
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 12px 24px rgba(0,0,0,0.45)
          `,
          md: `
            0 0 0 1px rgba(255,255,255,0.18),
            inset 0 1px 0 rgba(255,255,255,0.22),
            0 24px 48px rgba(0,0,0,0.55)
          `,
        },
      }}
    >
      <Box
        sx={{
          borderRadius: { xs: "16px", sm: "21px", md: "31px" },
          overflow: "hidden",
          bgcolor: "#000",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.85)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <PhoneBezel>
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        sx={{ width: "100%", display: "block", verticalAlign: "top" }}
      />
    </PhoneBezel>
  );
}

function PhoneShotSequence({
  sources,
  alt,
  active,
}: {
  sources: readonly string[];
  alt: string;
  active: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || sources.length <= 1) return;
    setIndex(0);
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % sources.length);
    }, QUIZ_PHONE_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [active, sources]);

  return (
    <PhoneBezel>
      <Box sx={{ position: "relative", width: "100%" }}>
        <Box
          component="img"
          src={sources[0]}
          alt=""
          aria-hidden
          sx={{ width: "100%", display: "block", visibility: "hidden" }}
        />
        {sources.map((src, i) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt={i === index ? alt : ""}
            aria-hidden={i !== index}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              opacity: i === index ? 1 : 0,
              transition: "opacity 480ms ease",
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                opacity: i === 0 ? 1 : 0,
              },
            }}
          />
        ))}
      </Box>
    </PhoneBezel>
  );
}

function ProjectorShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Stack spacing={1.25} sx={{ height: "100%", minWidth: 0 }}>
      <Typography sx={{ color: BRAND_TEXT_MUTED, fontSize: 13 }}>{eyebrow}</Typography>
      <Box
        sx={{
          flex: 1,
          border: `1px solid ${BRAND_BORDER}`,
          bgcolor: alpha("#0a0a0a", 0.95),
          p: { xs: 2.25, md: 3.5 },
          minHeight: { xs: 280, md: 420 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Stack
          spacing={title ? 3 : 0}
          sx={{ width: "100%", height: "100%", justifyContent: "center" }}
        >
          {title ? (
            <Typography
              sx={{
                fontFamily: BRAND_DISPLAY_FONT,
                fontWeight: 700,
                fontSize: { xs: "1.35rem", md: "1.85rem" },
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </Typography>
          ) : null}
          {children}
        </Stack>
      </Box>
    </Stack>
  );
}

/** Превью экрана зала: та же карточка, что на проекторе `speaker_questions`. */
function SpeakerQuestionsProjector({ visible }: { visible: boolean }) {
  return (
    <Stack
      spacing={0}
      sx={{
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {SPEAKER_QUESTIONS.map((item, idx, arr) => (
        <Box key={item.text} sx={{ width: "100%" }}>
          <Box
            sx={{
              width: "100%",
              py: { xs: 1.1, md: 1.25 },
              px: { xs: 1.75, md: 2.25 },
              minHeight: { xs: 96, md: 112 },
              display: "flex",
              alignItems: "center",
              bgcolor: "rgba(0, 0, 0, 0.16)",
              borderRadius: 2,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.985)",
              transition: `opacity 520ms cubic-bezier(0.2, 0.8, 0.2, 1) ${Math.min(idx * 90, 450)}ms, transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1) ${Math.min(idx * 90, 450)}ms`,
              "@media (prefers-reduced-motion: reduce)": {
                opacity: 1,
                transform: "none",
                transition: "none",
              },
            }}
          >
            <Stack spacing={1.25} sx={{ width: "100%" }}>
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 400,
                  lineHeight: 1.2,
                  fontSize: { xs: "1.15rem", md: "1.55rem" },
                  whiteSpace: "pre-line",
                }}
              >
                {item.text}
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 0.25 }}
              >
                <Typography
                  sx={{
                    opacity: 0.9,
                    color: "#fff",
                    fontSize: { xs: "0.85rem", md: "0.98rem" },
                    lineHeight: 1.3,
                  }}
                >
                  от {item.author}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="flex-end"
                >
                  {item.reactions.map((reaction) => (
                    <Box
                      key={`${item.text}_${reaction.emoji}`}
                      sx={{
                        border: `1px solid ${alpha("#fff", 0.5)}`,
                        borderRadius: 999,
                        px: 1,
                        py: 0.4,
                      }}
                    >
                      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                        {reaction.emoji} {reaction.count}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Stack>
          </Box>
          {idx < arr.length - 1 ? (
            <Box
              sx={{
                width: "100%",
                height: 1.5,
                my: { xs: 1.75, md: 2.25 },
                bgcolor: "rgba(255, 255, 255, 0.25)",
              }}
            />
          ) : null}
        </Box>
      ))}
    </Stack>
  );
}

function ResultBars({
  rows,
  visible,
}: {
  rows: readonly { label: string; pct: number; correct?: boolean }[];
  visible: boolean;
}) {
  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      {rows.map((row, index) => (
        <Box key={row.label}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }} spacing={1}>
            <Typography
              sx={{
                fontSize: { xs: 13, md: 14 },
                color: row.correct ? BRAND_ACCENT : "#fff",
                fontWeight: row.correct ? 700 : 400,
              }}
            >
              {row.label}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 13, md: 14 },
                color: BRAND_ACCENT,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {row.pct}%
            </Typography>
          </Stack>
          <Box sx={{ height: { xs: 8, md: 10 }, bgcolor: alpha("#fff", 0.08), overflow: "hidden" }}>
            <Box
              sx={{
                height: "100%",
                width: visible ? `${row.pct}%` : "0%",
                bgcolor: BRAND_ACCENT,
                transformOrigin: "left center",
                transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1) ${180 + index * 120}ms`,
                "@media (prefers-reduced-motion: reduce)": {
                  width: `${row.pct}%`,
                  transition: "none",
                },
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function LandingProofSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const [tab, setTab] = useState<ProofTabId>("poll");
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const updateTabIndicator = useCallback(() => {
    const list = tabListRef.current;
    const idx = TABS.findIndex((item) => item.id === tab);
    const activeBtn = tabBtnRefs.current[idx];
    if (!list || !activeBtn) return;
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
      ready: true,
    });
  }, [tab]);

  useLayoutEffect(() => {
    updateTabIndicator();
    window.addEventListener("resize", updateTabIndicator);
    return () => window.removeEventListener("resize", updateTabIndicator);
  }, [updateTabIndicator]);

  useEffect(() => {
    const list = tabListRef.current;
    const idx = TABS.findIndex((item) => item.id === tab);
    const activeBtn = tabBtnRefs.current[idx];
    if (!list || !activeBtn) return;
    // Только горизонтальный скролл tablist — без scrollIntoView (он прыгает по странице)
    const target = activeBtn.offsetLeft - (list.clientWidth - activeBtn.offsetWidth) / 2;
    list.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth",
    });
  }, [tab]);

  return (
    <Box
      component="section"
      id="proof"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 12 },
        borderTop: `1px solid ${BRAND_BORDER}`,
        overflowX: "clip",
      }}
    >
      <Container maxWidth={false} sx={{ ...LANDING_CONTAINER_SX, overflow: "visible" }}>
        <Stack spacing={{ xs: 4, md: 5 }} sx={{ ...landingRevealSx(visible), minWidth: 0 }}>
          <Stack
            key={tab}
            spacing={1.5}
            sx={{
              maxWidth: 640,
              ...landingRevealSx(visible, 0),
            }}
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
              {lt(activeTab.title)}
            </Typography>
            <Typography
              sx={{
                color: BRAND_TEXT_MUTED,
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.6,
              }}
            >
              {lt(activeTab.lead)}
            </Typography>
          </Stack>

          <Box
            sx={{
              position: "relative",
              // Bleed до правого края секции (секция клипает overflow — без скролла страницы)
              width: { xs: "calc(100% + 16px)", sm: "calc(100% + 24px)", md: "fit-content" },
              maxWidth: "100%",
              mr: { xs: -2, sm: -3, md: 0 },
              mx: { md: "auto" },
            }}
          >
            <Box
              ref={tabListRef}
              role="tablist"
              aria-label={lt("Форматы интерактивов")}
              sx={{
                position: "relative",
                display: { xs: "flex", md: "inline-flex" },
                flexWrap: "nowrap",
                width: { xs: "100%", md: "auto" },
                maxWidth: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorX: "contain",
                scrollSnapType: "x proximity",
                gap: 0.5,
                py: 0.5,
                pl: 0.5,
                pr: { xs: 3.5, md: 0.5 },
                bgcolor: alpha("#fff", 0.06),
                borderStyle: "solid",
                borderColor: BRAND_BORDER,
                borderWidth: "1px",
                borderRightWidth: { xs: 0, md: 1 },
                borderRadius: 999,
                borderTopRightRadius: { xs: 0, md: 999 },
                borderBottomRightRadius: { xs: 0, md: 999 },
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  top: 4,
                  left: 0,
                  height: "calc(100% - 8px)",
                  width: indicator.width,
                  transform: `translateX(${indicator.left}px)`,
                  borderRadius: 999,
                  bgcolor: BRAND_ACCENT,
                  opacity: indicator.ready ? 1 : 0,
                  transition:
                    "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease",
                  "@media (prefers-reduced-motion: reduce)": {
                    transition: "none",
                  },
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              {TABS.map((item, index) => {
                const active = item.id === tab;
                return (
                  <Box
                    key={item.id}
                    component="button"
                    type="button"
                    role="tab"
                    aria-selected={active}
                    ref={(el: HTMLButtonElement | null) => {
                      tabBtnRefs.current[index] = el;
                    }}
                    onClick={() => setTab(item.id)}
                    sx={{
                      position: "relative",
                      zIndex: 1,
                      appearance: "none",
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 999,
                      bgcolor: "transparent",
                      color: active ? "#000" : BRAND_TEXT_MUTED,
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: { xs: "0.75rem", md: "0.88rem" },
                      letterSpacing: "0.02em",
                      px: { xs: 1.25, md: 2 },
                      py: { xs: 0.9, md: 1.1 },
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      scrollSnapAlign: "center",
                      transition: "color 220ms ease",
                      "@media (prefers-reduced-motion: reduce)": {
                        transition: "none",
                      },
                      "&:hover": {
                        color: active ? "#000" : "#fff",
                      },
                    }}
                  >
                    {lt(item.label)}
                  </Box>
                );
              })}
            </Box>
            <Box
              aria-hidden
              sx={{
                display: { xs: "block", md: "none" },
                pointerEvents: "none",
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: 48,
                background: "linear-gradient(90deg, transparent 0%, #000 92%)",
              }}
            />
          </Box>

          {tab === "all" ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, minmax(0, 1fr))" },
                gap: { xs: 2.5, md: 3 },
                ...landingRevealSx(visible, 80),
              }}
            >
              {ALL_CAPABILITY_BLOCKS.map((block, blockIndex) => (
                <Box
                  key={block.title}
                  sx={{
                    ...landingRevealSx(visible, 100 + blockIndex * 60),
                    borderTop: `1px solid ${BRAND_BORDER}`,
                    pt: 2.25,
                    pb: 0.5,
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: BRAND_ACCENT,
                        "& .MuiSvgIcon-root": { fontSize: 32 },
                      }}
                    >
                      {block.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: BRAND_DISPLAY_FONT,
                        fontWeight: 700,
                        fontSize: { xs: "1.12rem", md: "1.25rem" },
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                      }}
                    >
                      {block.title}
                    </Typography>
                  </Stack>
                  <Stack spacing={1.15}>
                    {block.items.map((item) => (
                      <Stack key={item} direction="row" spacing={1.25} alignItems="center">
                        <Box
                          aria-hidden
                          sx={{
                            width: 7,
                            height: 7,
                            flexShrink: 0,
                            borderRadius: "50%",
                            bgcolor: BRAND_ACCENT,
                          }}
                        />
                        <Typography
                          sx={{
                            color: BRAND_TEXT_MUTED,
                            fontSize: { xs: "0.92rem", md: "0.98rem" },
                            lineHeight: 1.5,
                          }}
                        >
                          {item}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 0.85fr) minmax(0, 1.35fr)" },
                gap: { xs: 3, md: 4 },
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  ...landingRevealSx(visible, 80),
                  justifySelf: { xs: "center", md: "start" },
                  width: { xs: 220, sm: 240, md: 280 },
                  maxWidth: "100%",
                }}
              >
                {tab === "poll" ? (
                  <PhoneShot
                    src="/proof/phone-poll.webp"
                    alt={lt("Скриншот опроса на телефоне участника")}
                  />
                ) : null}

                {tab === "quiz" ? (
                  <PhoneShotSequence
                    sources={QUIZ_PHONE_SHOTS}
                    alt={lt("Скриншоты квиза на телефоне участника")}
                    active={tab === "quiz"}
                  />
                ) : null}

                {tab === "tags" ? (
                  <PhoneShot
                    src="/proof/phone-tags.webp"
                    alt={lt("Скриншот облака тегов на телефоне участника")}
                  />
                ) : null}

                {tab === "speaker" ? (
                  <PhoneShot
                    src="/proof/phone-speaker.webp"
                    alt={lt("Скриншот вопроса спикеру на телефоне участника")}
                  />
                ) : null}

                {tab === "feedback" ? (
                  <PhoneShot
                    src="/proof/phone-feedback.webp"
                    alt={lt("Скриншот обратной связи на телефоне участника")}
                  />
                ) : null}
              </Box>

              <Box sx={landingRevealSx(visible, 160)} key={tab}>
                {tab === "poll" ? (
                  <ProjectorShell
                    eyebrow={lt("Экран зала")}
                    title={lt("Что сдерживает роботизацию в вашей компании?")}
                  >
                    <ResultBars rows={POLL_BARS} visible={visible} />
                  </ProjectorShell>
                ) : null}

                {tab === "quiz" ? (
                  <ProjectorShell eyebrow={lt("Экран зала")} title={lt("Турнирная таблица")}>
                    <Box sx={{ width: "100%", minHeight: { xs: 260, md: 320 } }}>
                      <ProjectorLeaderboardTable
                        leaders={QUIZ_LEADERS}
                        winnersRowsCount={3}
                        fadeKey={visible ? 1 : 0}
                        brandPrimaryColor={BRAND_ACCENT}
                        brandAccentColor={BRAND_ACCENT}
                        brandTextColor="#111"
                        embedded
                      />
                    </Box>
                  </ProjectorShell>
                ) : null}

                {tab === "tags" ? (
                  <ProjectorShell eyebrow={lt("Экран зала")}>
                    <Box
                      sx={{ width: "100%", height: { xs: 260, sm: 300, md: 360 }, minHeight: 0 }}
                    >
                      <QuestionChart
                        question={TAG_CLOUD_QUESTION}
                        showVoteCount={false}
                        questionRevealStage="results"
                        fillHeight
                        cloudTagColors={TAG_CLOUD_COLORS}
                        cloudTopTagColor={BRAND_ACCENT}
                        cloudTagPadding={3}
                        cloudAnimationStrength={visible ? 36 : 0}
                        brandFontFamily={BRAND_DISPLAY_FONT}
                      />
                    </Box>
                  </ProjectorShell>
                ) : null}

                {tab === "speaker" ? (
                  <ProjectorShell eyebrow={lt("Экран зала")}>
                    <SpeakerQuestionsProjector visible={visible} />
                  </ProjectorShell>
                ) : null}

                {tab === "feedback" ? (
                  <ProjectorShell eyebrow={lt("Экран зала")} title={lt("Оценка мероприятия")}>
                    <Stack spacing={2.5} sx={{ width: "100%" }}>
                      <Stack direction="row" alignItems="baseline" spacing={1.5}>
                        <Typography
                          sx={{
                            fontFamily: BRAND_DISPLAY_FONT,
                            fontWeight: 800,
                            fontSize: { xs: "3rem", md: "4rem" },
                            color: BRAND_ACCENT,
                            lineHeight: 1,
                          }}
                        >
                          4.6
                        </Typography>
                        <Typography sx={{ color: BRAND_TEXT_MUTED, fontSize: 15 }}>
                          {lt("из 5 · 128 отзывов")}
                        </Typography>
                      </Stack>
                      <ResultBars
                        rows={FEEDBACK_SCORES.map((row) => ({
                          label: lt(`Оценка ${row.label}`),
                          pct: row.pct,
                        }))}
                        visible={visible}
                      />
                    </Stack>
                  </ProjectorShell>
                ) : null}
              </Box>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
