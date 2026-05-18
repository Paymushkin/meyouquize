import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Fade,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import CloseIcon from "@mui/icons-material/Close";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { Link as RouterLink } from "react-router-dom";
import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { BrandFooter } from "./brand/BrandFooter";
import type { DemoTitrePair } from "./landingDemo/DemoScenarioCaptions";
import {
  DEMO_TAB_QUIZ,
  DEMO_TAB_RANDOMIZER,
  DEMO_TAB_REACTIONS,
  DEMO_TAB_SPEAKER_QUESTIONS,
  DEMO_TAB_TAG_CLOUD,
} from "./landingDemo/demoTabIndices";
import { LandingDemoScenarioShell } from "./landingDemo/LandingDemoScenarioShell";
import { DEMO_LANDING_PHONE_BANNER_SRC } from "./landingDemo/demoAssets";
import { useDemoScenarioWheel } from "./landingDemo/useDemoScenarioWheel";
import { QuestionChart } from "../components/projector/QuestionChart";
import { ProjectorLeaderboardTable } from "../components/projector/ProjectorLeaderboardTable";
import type {
  ProjectorLeader,
  ProjectorQuestionResult,
  ProjectorTagCloudWord,
} from "../types/projectorDashboard";
import { BRAND_ACCENT, BRAND_BORDER, BRAND_SURFACE } from "../theme/brandTheme";

/** Три вопроса демо-квиза по 3 сцены: голосование → выбор + результаты → принято + обновление на проекторе */
const DEMO_QUIZ_POLLS = [
  {
    question: "Какие страны граничат с Россией?",
    options: ["Казахстан", "Финляндия", "Япония", "Монголия"],
    optionLabelsUpper: ["КАЗАХСТАН", "ФИНЛЯНДИЯ", "ЯПОНИЯ", "МОНГОЛИЯ"],
    maxPicks: 2,
    /** В демо пользователь «отмечает» два варианта на телефоне */
    demoSelectedIndices: [0, 1] as const,
    /** Верные варианты по номерам в списке (1, 2, 4 → индексы 0, 1, 3) */
    correctIndices: [0, 1, 3] as const,
    results: [
      { label: "Казахстан", pct: 68 },
      { label: "Финляндия", pct: 22 },
      { label: "Япония", pct: 6 },
      { label: "Монголия", pct: 4 },
    ],
    resultsAfter: [
      { label: "Казахстан", pct: 58 },
      { label: "Финляндия", pct: 32 },
      { label: "Япония", pct: 6 },
      { label: "Монголия", pct: 4 },
    ],
  },
  {
    question: "Сколько часовых поясов пересекает территория России?",
    options: ["9", "10", "11", "12"],
    optionLabelsUpper: ["9", "10", "11", "12"],
    maxPicks: 1,
    demoSelectedIndices: [2] as const,
    correctIndices: [2] as const,
    results: [
      { label: "9", pct: 14 },
      { label: "10", pct: 19 },
      { label: "11", pct: 48 },
      { label: "12", pct: 19 },
    ],
    resultsAfter: [
      { label: "9", pct: 10 },
      { label: "10", pct: 16 },
      { label: "11", pct: 58 },
      { label: "12", pct: 16 },
    ],
  },
  {
    question: "Сколько букв в современном русском алфавите?",
    options: ["31", "32", "33", "34"],
    optionLabelsUpper: ["31", "32", "33", "34"],
    maxPicks: 1,
    demoSelectedIndices: [2] as const,
    correctIndices: [2] as const,
    results: [
      { label: "31", pct: 8 },
      { label: "32", pct: 14 },
      { label: "33", pct: 63 },
      { label: "34", pct: 15 },
    ],
    resultsAfter: [
      { label: "31", pct: 7 },
      { label: "32", pct: 12 },
      { label: "33", pct: 68 },
      { label: "34", pct: 13 },
    ],
  },
] as const;

const PROJECTOR_CORRECT_GREEN = "#8fefb0";

const DEMO_TAG_CLOUD_SCENE_COUNT = 3;
const DEMO_TAG_CLOUD_MAX_SCENE_INDEX = DEMO_TAG_CLOUD_SCENE_COUNT - 1;

/** Финальная сцена сценария — индекс после последнего шага квиза */
const DEMO_LEADERBOARD_SCENE_INDEX = 2 + DEMO_QUIZ_POLLS.length * 3;

/** Таблица результатов на проекторе (превью на лендинге — 7 строк, «наш» игрок на 3 месте). */
const DEMO_PROJECTOR_LEADERS: ProjectorLeader[] = [
  { participantId: "ld1", nickname: "Алиса", score: 37, totalResponseMs: 15_860 },
  { participantId: "ld2", nickname: "Артём", score: 37, totalResponseMs: 15_860 + 12_740 },
  {
    participantId: "ld3",
    nickname: "Комета23",
    score: 37,
    totalResponseMs: 15_860 + 12_740 + 156_000,
  },
  { participantId: "ld4", nickname: "София", score: 36, totalResponseMs: 20_840 },
  { participantId: "ld5", nickname: "Даниил", score: 36, totalResponseMs: 20_840 + 17_610 },
  { participantId: "ld6", nickname: "Екатерина", score: 32, totalResponseMs: 41_000 },
  { participantId: "ld7", nickname: "Мария", score: 31, totalResponseMs: 28_540 },
];

/** Карточка «3 место» на телефоне — 3-я строка лидерборда */
const DEMO_PHONE_THIRD_PLACE = {
  name: DEMO_PROJECTOR_LEADERS[2].nickname,
  score: DEMO_PROJECTOR_LEADERS[2].score,
  correct: 8,
  time: "+2:36.00",
};

/** Две строки титров по сцене: `prev` — прошлая (или null в сцене 1), `cur` — актуальная. */
const DEMO_TITRE_PAIRS: ReadonlyArray<DemoTitrePair> = [
  { prev: null, cur: "Гости авторизуются через QR-код" },
  { prev: "Гости авторизуются через QR-код", cur: "Гости ожидают начало квиза" },
  { prev: "Гости ожидают начало квиза", cur: "Отображается первый вопрос" },
  { prev: "Отображается первый вопрос", cur: "Гости голосуют, на экране отображаются результаты" },
  {
    prev: "Гости голосуют, на экране отображаются результаты",
    cur: "Отображаются правильные ответы",
  },
  { prev: "Отображаются правильные ответы", cur: "Отображается второй вопрос" },
  { prev: "Отображается второй вопрос", cur: "Гости голосуют, на экране отображаются результаты" },
  {
    prev: "Гости голосуют, на экране отображаются результаты",
    cur: "Отображаются правильные ответы",
  },
  { prev: "Отображаются правильные ответы", cur: "Отображается третий вопрос" },
  { prev: "Отображается третий вопрос", cur: "Гости голосуют, на экране отображаются результаты" },
  {
    prev: "Гости голосуют, на экране отображаются результаты",
    cur: "Отображаются правильные ответы",
  },
  {
    prev: "Отображаются правильные ответы",
    cur: "Отображаются победители квиза. Сценарий демо завершён — листайте ниже",
  },
];

const DEMO_SCENE_COUNT = DEMO_TITRE_PAIRS.length;

function getDemoQuizPhoneSceneState(sceneIndex: number) {
  const lastQuizScene = 2 + DEMO_QUIZ_POLLS.length * 3 - 1;
  const quizBlockIndex =
    sceneIndex >= 2 && sceneIndex <= lastQuizScene ? Math.floor((sceneIndex - 2) / 3) : -1;
  const blockStart = quizBlockIndex >= 0 ? 2 + quizBlockIndex * 3 : -1;
  const withinBlockOffset = quizBlockIndex >= 0 ? sceneIndex - blockStart : -1;
  const phoneModalPoll = quizBlockIndex >= 0 ? DEMO_QUIZ_POLLS[quizBlockIndex] : DEMO_QUIZ_POLLS[0];
  const phoneQuizQuestionOrdinal = quizBlockIndex >= 0 ? quizBlockIndex + 1 : 1;
  const phoneQuizOverlayOpen = sceneIndex >= 2 && sceneIndex <= lastQuizScene;
  const phoneShowVoteOverlay = withinBlockOffset === 0 || withinBlockOffset === 1;
  const phoneVoteSelected = withinBlockOffset === 1;
  const phoneShowAcceptedOverlay = withinBlockOffset === 2;
  const phoneLeaderboardOverlay = sceneIndex >= DEMO_LEADERBOARD_SCENE_INDEX;
  return {
    phoneModalPoll,
    phoneQuizQuestionOrdinal,
    phoneQuizOverlayOpen,
    phoneShowVoteOverlay,
    phoneVoteSelected,
    phoneShowAcceptedOverlay,
    phoneLeaderboardOverlay,
  };
}

function DemoQuizProjectorQrSlideBody() {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, md: 4 }}
      alignItems="center"
      justifyContent="space-between"
      sx={{
        width: "100%",
        px: { xs: 1, md: 2 },
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          color: "#fff",
          fontSize: { xs: "1.25rem", md: "2.7rem" },
          lineHeight: 1.12,
          maxWidth: { xs: 320, md: 720 },
        }}
      >
        Сканируйте QR-код, чтобы
        <br />
        войти в ивент
      </Typography>
      <Box
        sx={{
          width: { xs: 140, md: 220 },
          height: { xs: 140, md: 220 },
          bgcolor: "#fff",
          borderRadius: "8px",
          p: { xs: 1.25, md: 1.75 },
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
        aria-hidden
      >
        <QrCode2Icon
          sx={{
            fontSize: { xs: 96, md: 168 },
            color: "#141414",
          }}
        />
      </Box>
    </Stack>
  );
}

function DemoQuizProjectorReactionsSlideBody() {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, md: 4 }}
      alignItems="flex-end"
      flexWrap="wrap"
      justifyContent="center"
      sx={{ width: "100%" }}
    >
      {DEMO_REACTIONS_PROJECTOR_ROWS.map((row) => (
        <Stack key={row.label} alignItems="center" spacing={0.75}>
          <Typography sx={{ fontSize: { xs: "2.5rem", md: "3.25rem" }, lineHeight: 1 }}>
            {row.emoji}
          </Typography>
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: { xs: 13, md: 15 } }}>
            {row.pct}%
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
            {row.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

const DEMO_REACTIONS_PROJECTOR_ROWS = [
  { emoji: "🔥", label: "Огонь", pct: 42 },
  { emoji: "👏", label: "Аплодисменты", pct: 28 },
  { emoji: "❤️", label: "Сердечки", pct: 19 },
  { emoji: "😂", label: "Смех", pct: 11 },
] as const;

const LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT = "Какие темы для вас самые важны на этом ивенте?";

/** «Живые» ответы зала до отправки демо-пользователя (как на проекторе: крупные слова в облаке) */
const LANDING_TAG_CLOUD_BASE_TAGS: ProjectorTagCloudWord[] = [
  { text: "Кофе", count: 22 },
  { text: "Север", count: 19 },
  { text: "Пицца", count: 18 },
  { text: "Нетворкинг", count: 12 },
  { text: "Продукт", count: 10 },
  { text: "Маркетинг", count: 9 },
  { text: "AI", count: 8 },
  { text: "HR", count: 6 },
];

const LANDING_TAG_CLOUD_USER_TAGS = ["Залив", "Сцена", "Закуски"] as const;

function mergeLandingTagCloudWithUser(
  base: ProjectorTagCloudWord[],
  user: readonly string[],
): ProjectorTagCloudWord[] {
  const map = new Map<string, ProjectorTagCloudWord>();
  for (const row of base) {
    const key = row.text.trim().toLocaleLowerCase("ru-RU");
    map.set(key, { text: row.text, count: row.count });
  }
  for (const raw of user) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLocaleLowerCase("ru-RU");
    const cur = map.get(key);
    if (cur) {
      map.set(key, { text: cur.text, count: cur.count + 1 });
    } else {
      map.set(key, { text: t, count: 1 });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"),
  );
}

function landingTagCloudDemoQuestion(tagCloud: ProjectorTagCloudWord[]): ProjectorQuestionResult {
  return {
    questionId: "landing-tag-cloud-demo",
    text: LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT,
    type: "tag_cloud",
    optionStats: [],
    tagCloud,
  };
}

const landingTagCloudChipSx = {
  height: 24,
  color: "#111",
  bgcolor: "transparent",
  border: "none",
  borderRadius: 0,
  borderBottom: `2px solid ${BRAND_ACCENT}`,
  "& .MuiChip-label": { px: 1, fontSize: "0.72rem", fontWeight: 600, color: "#111" },
} as const;

const landingTagCloudPopupCardSx = {
  width: "100%",
  maxWidth: 292,
  maxHeight: "92%",
  borderRadius: "14px",
  bgcolor: "rgba(28, 31, 36, 0.94)",
  borderColor: "rgba(255,255,255,0.22)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
  overflow: "auto",
} as const;

const DEMO_TAG_CLOUD_TITRE_PAIRS: ReadonlyArray<DemoTitrePair> = [
  { prev: null, cur: "Гости видят вопрос на экране и форму ответа на телефоне" },
  {
    prev: "Гости видят вопрос на экране и форму ответа на телефоне",
    cur: "Ответы собираются в облаке тегов на проекторе",
  },
  {
    prev: "Ответы собираются в облаке тегов на проекторе",
    cur: "После отправки в облако дозалетают новые темы — сценарий демо завершён, листайте ниже",
  },
];

const DEMO_SPEAKER_QUESTIONS_TITRE_PAIRS: ReadonlyArray<DemoTitrePair> = [
  {
    prev: null,
    cur: "Вопрос к спикеру на экране: контекст и статус без лишнего шума в чате",
  },
];

const DEMO_REACTIONS_TITRE_PAIRS: ReadonlyArray<DemoTitrePair> = [
  { prev: null, cur: "Реакции с телефонов отображаются на проекторе в реальном времени" },
];

const DEMO_RANDOMIZER_TITRE_PAIRS: ReadonlyArray<DemoTitrePair> = [
  { prev: null, cur: "Имя и номер билета победителя на экране — честный розыгрыш для всех гостей" },
];

type LandingDemoScenarioTabProps = {
  sectionRef: RefObject<HTMLElement | null>;
  demoTabRef: MutableRefObject<number>;
};

function LandingDemoTagCloudTab({ sectionRef, demoTabRef }: LandingDemoScenarioTabProps) {
  const { sceneIndex, sceneProgress } = useDemoScenarioWheel({
    sectionRef,
    demoTabRef,
    activeDemoTabIndex: DEMO_TAB_TAG_CLOUD,
    maxSceneIndex: DEMO_TAG_CLOUD_MAX_SCENE_INDEX,
  });

  const projectorQuestion = useMemo(() => {
    if (sceneIndex === 0) {
      return landingTagCloudDemoQuestion([]);
    }
    if (sceneIndex === 1) {
      return landingTagCloudDemoQuestion([...LANDING_TAG_CLOUD_BASE_TAGS]);
    }
    return landingTagCloudDemoQuestion(
      mergeLandingTagCloudWithUser(LANDING_TAG_CLOUD_BASE_TAGS, LANDING_TAG_CLOUD_USER_TAGS),
    );
  }, [sceneIndex]);

  const questionRevealStage = sceneIndex === 0 ? ("options" as const) : ("results" as const);

  const cloudHeader =
    sceneIndex === 0 ? (
      <Typography
        variant="h3"
        align="center"
        sx={{
          fontWeight: 700,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#fff",
          textAlign: "center",
          width: "fit-content",
          maxWidth: "100%",
          mx: "auto",
          px: 1,
          pt: 1,
          pb: 1,
          fontSize: { xs: "1.05rem", sm: "1.2rem", md: "1.4rem" },
          lineHeight: 1.2,
          textShadow: "0 1px 12px rgba(0,0,0,0.55)",
        }}
      >
        {LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT}
      </Typography>
    ) : undefined;

  const phoneOverlay = useMemo(() => {
    const cardShell = (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 0.5,
          px: 0.25,
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.38)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            borderRadius: "inherit",
          }}
        />
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {sceneIndex === 0 ? (
            <Card variant="outlined" sx={landingTagCloudPopupCardSx}>
              <CardContent sx={{ p: 1.25 }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Chip label="Облако тегов" size="small" sx={landingTagCloudChipSx} />
                    <IconButton
                      size="small"
                      aria-label="Закрыть"
                      disabled
                      sx={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography
                    sx={{ color: "#fff", fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}
                  >
                    {LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>
                    До 3 коротких тегов — как в приложении на ивенте.
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled
                    size="medium"
                    sx={{
                      fontWeight: 700,
                      color: "#111",
                      bgcolor: BRAND_ACCENT,
                      "&.Mui-disabled": {
                        bgcolor: "rgba(243,247,34,0.35)",
                        color: "rgba(0,0,0,0.45)",
                      },
                    }}
                  >
                    Отправить ответ
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : sceneIndex === 1 ? (
            <Card variant="outlined" sx={landingTagCloudPopupCardSx}>
              <CardContent sx={{ p: 1.25 }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Chip label="Облако тегов" size="small" sx={landingTagCloudChipSx} />
                    <IconButton
                      size="small"
                      aria-label="Закрыть"
                      disabled
                      sx={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography
                    sx={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}
                  >
                    {LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT}
                  </Typography>
                  <Stack spacing={1.25} sx={{ pt: 0.25 }}>
                    {LANDING_TAG_CLOUD_USER_TAGS.map((value, index) => (
                      <TextField
                        key={`tag-${index}`}
                        value={value}
                        size="small"
                        disabled
                        multiline
                        minRows={1}
                        maxRows={2}
                        placeholder={`Ответ ${index + 1}`}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            color: "#fff",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.35)" },
                          },
                        }}
                      />
                    ))}
                  </Stack>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled
                    sx={{
                      mt: 0.5,
                      fontWeight: 700,
                      color: "#111",
                      bgcolor: BRAND_ACCENT,
                      "&.Mui-disabled": { bgcolor: BRAND_ACCENT, color: "#111", opacity: 0.85 },
                    }}
                  >
                    Отправить ответ
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" sx={landingTagCloudPopupCardSx}>
              <CardContent sx={{ p: 1.25 }}>
                <Stack spacing={1.25}>
                  <Typography
                    sx={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}
                  >
                    {LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT}
                  </Typography>
                  <Alert
                    severity="success"
                    sx={{ bgcolor: "rgba(46,125,50,0.2)", color: "#e8f5e9" }}
                  >
                    Ответ принят
                  </Alert>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                    Отправлено: {LANDING_TAG_CLOUD_USER_TAGS.join(", ")}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    );
    return cardShell;
  }, [sceneIndex]);

  return (
    <LandingDemoScenarioShell
      description={
        <>
          Листайте колёсиком мыши или жестом тачпада в зоне демо-блока (как во вкладке «Квиз»): три
          сцены — вопрос, ответы на телефоне и облако на экране, затем отправка с дозалётом тегов в
          то же облако.
        </>
      }
      sceneProgress={sceneProgress}
      sceneIndex={sceneIndex}
      captionPairs={DEMO_TAG_CLOUD_TITRE_PAIRS}
      phoneSlot={<DemoQuizPhoneColumn sceneIndex={1} screenOverlay={phoneOverlay} />}
      projectorSlot={
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {sceneIndex > 0 ? (
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                textAlign: "center",
                mb: 1,
                fontSize: { xs: "1.05rem", md: "1.35rem" },
                lineHeight: 1.2,
                flexShrink: 0,
                width: "fit-content",
                maxWidth: "100%",
                mx: "auto",
                alignSelf: "center",
              }}
            >
              {LANDING_TAG_CLOUD_DEMO_QUESTION_TEXT}
            </Typography>
          ) : null}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <QuestionChart
              question={projectorQuestion}
              showVoteCount={false}
              questionRevealStage={questionRevealStage}
              fillHeight
              cloudHeader={cloudHeader}
              cloudTagColors={["#eceff1", "#90caf9", "#a5d6a7", "#ffcc80", "#ce93d8"]}
              cloudTopTagColor="#ff8a80"
              cloudCorrectTagColor="#a5d6a7"
              cloudDensity={58}
              cloudAnimationStrength={38}
              tagCloudSnapRelayout={sceneIndex >= 1}
              voteOptionTextColor="#eceff1"
              voteProgressTrackColor="rgba(255,255,255,0.22)"
              voteProgressBarColor="#90caf9"
              brandPrimaryColor="#90caf9"
            />
          </Box>
        </Box>
      }
    />
  );
}

function DemoQuizPhoneColumn(props: { sceneIndex: number; screenOverlay?: ReactNode }) {
  const sceneIndex = props.sceneIndex;
  const screenOverlay = props.screenOverlay;
  const {
    phoneModalPoll,
    phoneQuizQuestionOrdinal,
    phoneQuizOverlayOpen,
    phoneShowVoteOverlay,
    phoneVoteSelected,
    phoneShowAcceptedOverlay,
    phoneLeaderboardOverlay,
  } = getDemoQuizPhoneSceneState(sceneIndex);

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 330 },
        maxWidth: 360,
        aspectRatio: "9 / 19.5",
        position: "relative",
        isolation: "isolate",
      }}
    >
      <Box
        component="img"
        src="/PHONE.png"
        alt="Рамка телефона"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          zIndex: 1,
          top: { xs: "6.25%", md: "6.45%" },
          bottom: { xs: "1.45%", md: "1.35%" },
          left: { xs: "3.35%", md: "3.35%" },
          right: { xs: "3.35%", md: "3.35%" },
          boxSizing: "border-box",
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.72)), url('/event-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "40px",
          px: 1,
          py: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          overflow: "hidden",
          clipPath: "inset(0 round 40px)",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
            "@keyframes sceneContentIn": {
              from: { opacity: 0.68, transform: "translateY(12px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Fade in={sceneIndex === 0} timeout={420} unmountOnExit>
            <Box sx={{ width: "100%", height: "100%" }}>
              <Stack
                sx={{
                  height: "100%",
                  justifyContent: "space-between",
                  animation: "sceneContentIn 460ms cubic-bezier(0.22, 0.78, 0.2, 1)",
                }}
              >
                <Box />
                <Stack alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 210,
                      height: 210,
                      border: "2px solid rgba(255,255,255,0.92)",
                      borderRadius: 3,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "&::before, &::after": {
                        content: '""',
                        position: "absolute",
                        width: 24,
                        height: 24,
                        borderColor: BRAND_ACCENT,
                      },
                      "&::before": {
                        top: -2,
                        left: -2,
                        borderTop: "3px solid",
                        borderLeft: "3px solid",
                      },
                      "&::after": {
                        bottom: -2,
                        right: -2,
                        borderBottom: "3px solid",
                        borderRight: "3px solid",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "#fff",
                        borderRadius: 2,
                        p: 1.25,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
                      }}
                    >
                      <QrCode2Icon sx={{ fontSize: 124, color: "#111" }} aria-hidden />
                    </Box>
                  </Box>
                  <Typography sx={{ color: "#fff", fontWeight: 600 }}>
                    Наведите камеру на QR-код
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="center">
                  <Box
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: "50%",
                      border: "3px solid #fff",
                      boxShadow: "0 0 0 4px rgba(255,255,255,0.2) inset",
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Fade>

          {sceneIndex >= 1 && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Stack
                spacing={1.5}
                sx={{
                  width: "100%",
                  flex: 1,
                  minHeight: 0,
                  animation: "sceneContentIn 460ms cubic-bezier(0.22, 0.78, 0.2, 1)",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <Box
                    sx={{
                      height: 28,
                      px: 1,
                      borderRadius: 999,
                      border: `1px solid rgba(255,255,255,0.6)`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#fff",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    <PersonOutlineIcon sx={{ fontSize: 14, color: "inherit" }} />
                    <Typography
                      component="span"
                      sx={{ color: "inherit", fontSize: "inherit", fontWeight: 600 }}
                    >
                      Комета
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 28,
                      px: 1,
                      borderRadius: 999,
                      bgcolor: BRAND_ACCENT,
                      color: "#111",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{ color: "#111", fontSize: "inherit", fontWeight: 700 }}
                    >
                      Онлайн
                    </Typography>
                  </Box>
                </Stack>
                <Box
                  component="img"
                  src="/logo.svg"
                  alt="Логотип"
                  sx={{ width: 56, height: 56, mt: 1.5 }}
                />
                <Box
                  sx={{
                    width: 285,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1,
                    alignItems: "start",
                  }}
                >
                  <Box
                    component="a"
                    href="https://ya.ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      gridColumn: "1 / -1",
                      textDecoration: "none",
                      width: "100%",
                      height: 54,
                      borderRadius: "16px",
                      px: 1.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: `1px solid ${BRAND_BORDER}`,
                      background: "#d9d9d9",
                      color: "#000",
                    }}
                  >
                    <Typography sx={{ fontSize: 20, fontWeight: 400, lineHeight: 1 }}>
                      Программа
                    </Typography>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "1.5px solid #000",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <EventNoteIcon sx={{ fontSize: 16, color: "#000" }} />
                    </Box>
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    sx={{
                      gridColumn: "1 / -1",
                      width: "100%",
                      height: 54,
                      borderRadius: "16px",
                      px: 1.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: `1px solid ${BRAND_BORDER}`,
                      background: BRAND_ACCENT,
                      color: "#000",
                      cursor: "pointer",
                    }}
                  >
                    <Typography sx={{ fontSize: 20, fontWeight: 400, lineHeight: 1 }}>
                      Вопросы спикерам
                    </Typography>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        border: "1.5px solid #000",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <QuestionAnswerIcon sx={{ fontSize: 17, color: "#000" }} />
                    </Box>
                  </Box>
                  <Box
                    component="a"
                    href="https://ya.ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "16px",
                      overflow: "hidden",
                      display: "block",
                      textDecoration: "none",
                      border: `1px solid ${BRAND_BORDER}`,
                    }}
                  >
                    <Box
                      component="img"
                      src={DEMO_LANDING_PHONE_BANNER_SRC}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  </Box>
                  <Card
                    variant="outlined"
                    component="button"
                    type="button"
                    sx={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      textAlign: "left",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "16px",
                      bgcolor: "rgba(0,0,0,0.22)",
                      backdropFilter: "blur(3px)",
                      WebkitBackdropFilter: "blur(3px)",
                      p: 1,
                      cursor: "pointer",
                      overflow: "hidden",
                      position: "relative",
                      color: "#fff",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 34,
                        background:
                          "linear-gradient(to bottom, rgba(8,12,24,0) 0%, rgba(8,12,24,0.85) 62%, rgba(8,12,24,0.98) 100%)",
                        pointerEvents: "none",
                        zIndex: 2,
                      },
                    }}
                  >
                    <CardContent
                      sx={{ p: 0, "&:last-child": { pb: 0 }, position: "relative", zIndex: 1 }}
                    >
                      <Stack spacing={0.8}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.2,
                            fontSize: 11.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={DEMO_QUIZ_POLLS[0].question}
                        >
                          {DEMO_QUIZ_POLLS[0].question}
                        </Typography>
                        <Stack spacing={0.6}>
                          {DEMO_QUIZ_POLLS[0].results.map((option, index) => (
                            <Box key={option.label} sx={{ p: 0 }}>
                              <Box
                                sx={{
                                  position: "relative",
                                  borderRadius: "5px",
                                  overflow: "hidden",
                                }}
                              >
                                <LinearProgress
                                  variant="determinate"
                                  value={option.pct}
                                  sx={{
                                    position: "absolute",
                                    inset: 0,
                                    height: "100%",
                                    bgcolor: "rgba(166,171,39,0.35)",
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor: index === 0 ? BRAND_ACCENT : "rgba(166,171,39,0.8)",
                                    },
                                  }}
                                />
                                <Typography
                                  component="div"
                                  sx={{
                                    position: "relative",
                                    color: "#000",
                                    fontWeight: 400,
                                    fontSize: 10.5,
                                    pointerEvents: "none",
                                    px: 0.8,
                                    py: 0.45,
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {option.label}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>

              {(phoneQuizOverlayOpen || phoneLeaderboardOverlay) && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <Fade in timeout={420} appear>
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        bgcolor: "rgba(0,0,0,0.42)",
                        backdropFilter: "blur(3px)",
                        WebkitBackdropFilter: "blur(3px)",
                      }}
                    />
                  </Fade>
                  <Box
                    sx={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      maxWidth: 292,
                      px: 0.75,
                      minHeight: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {phoneQuizOverlayOpen && (
                      <>
                        <Fade
                          in={phoneShowVoteOverlay}
                          timeout={520}
                          appear
                          unmountOnExit
                          key={`phone-vote-q${phoneQuizQuestionOrdinal}`}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "100%",
                              px: 0,
                            }}
                          >
                            <Card
                              variant="outlined"
                              sx={{
                                width: "100%",
                                borderRadius: "16px",
                                bgcolor: "rgba(28, 31, 36, 0.94)",
                                borderColor: "rgba(255,255,255,0.22)",
                                overflow: "hidden",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
                              }}
                            >
                              <CardContent sx={{ p: 1.25, width: "100%", boxSizing: "border-box" }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  sx={{ mb: 1.15 }}
                                >
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Typography
                                      sx={{
                                        color: "#fff",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        lineHeight: 1,
                                      }}
                                    >
                                      Вопрос {phoneQuizQuestionOrdinal} / 3
                                    </Typography>
                                    <Typography
                                      sx={{
                                        color: "#fff",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {phoneModalPoll.maxPicks > 1
                                        ? `${phoneModalPoll.maxPicks} ответа`
                                        : "Один ответ"}
                                    </Typography>
                                  </Stack>
                                  <Typography sx={{ color: "#fff", fontSize: 20, lineHeight: 1 }}>
                                    ×
                                  </Typography>
                                </Stack>
                                <Box
                                  sx={{ height: 2, width: 84, bgcolor: BRAND_ACCENT, mb: 1.45 }}
                                />
                                <Typography
                                  sx={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 23,
                                    lineHeight: 1.15,
                                    mb: 1.4,
                                  }}
                                >
                                  {phoneModalPoll.question}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  useFlexGap
                                  flexWrap="wrap"
                                  sx={{ mb: 1.6 }}
                                >
                                  {phoneModalPoll.optionLabelsUpper.map((option, i) => {
                                    const picks =
                                      phoneModalPoll.demoSelectedIndices as readonly number[];
                                    const selected = phoneVoteSelected && picks.includes(i);
                                    const dimmed = phoneVoteSelected && !picks.includes(i);
                                    return (
                                      <Box
                                        key={`${i}-${option}`}
                                        sx={{
                                          borderRadius: "14px",
                                          border: "1px solid rgba(255,255,255,0.95)",
                                          px: 1.2,
                                          py: 0.62,
                                          color: "#fff",
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          transition:
                                            "background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease, opacity 0.35s ease",
                                          ...(selected && {
                                            bgcolor: BRAND_ACCENT,
                                            color: "#000",
                                            borderColor: BRAND_ACCENT,
                                          }),
                                          ...(dimmed && {
                                            opacity: 0.4,
                                            borderColor: "rgba(255,255,255,0.28)",
                                          }),
                                        }}
                                      >
                                        {option}
                                      </Box>
                                    );
                                  })}
                                </Stack>
                                <Box
                                  sx={{
                                    height: 40,
                                    borderRadius: "12px",
                                    bgcolor: phoneVoteSelected
                                      ? BRAND_ACCENT
                                      : "rgba(255,255,255,0.18)",
                                    color: phoneVoteSelected ? "#000" : "rgba(255,255,255,0.58)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    letterSpacing: "0.02em",
                                    transition: "background-color 0.35s ease, color 0.35s ease",
                                  }}
                                >
                                  ОТПРАВИТЬ ОТВЕТ
                                </Box>
                              </CardContent>
                            </Card>
                          </Box>
                        </Fade>
                        <Fade
                          in={phoneShowAcceptedOverlay}
                          timeout={520}
                          appear
                          unmountOnExit
                          key={`phone-accepted-q${phoneQuizQuestionOrdinal}`}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "100%",
                              px: 0,
                            }}
                          >
                            <Card
                              variant="outlined"
                              sx={{
                                width: "100%",
                                borderRadius: "16px",
                                bgcolor: "rgba(28, 31, 36, 0.94)",
                                borderColor: "rgba(255,255,255,0.22)",
                                overflow: "hidden",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
                              }}
                            >
                              <CardContent
                                sx={{
                                  p: 2,
                                  width: "100%",
                                  boxSizing: "border-box",
                                  textAlign: "center",
                                }}
                              >
                                <CheckCircleIcon
                                  sx={{
                                    fontSize: 44,
                                    color: BRAND_ACCENT,
                                    mb: 1,
                                    display: "block",
                                    mx: "auto",
                                  }}
                                />
                                <Typography
                                  sx={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 18,
                                    lineHeight: 1.25,
                                  }}
                                >
                                  Ваш ответ принят
                                </Typography>
                              </CardContent>
                            </Card>
                          </Box>
                        </Fade>
                      </>
                    )}
                    {phoneLeaderboardOverlay && (
                      <Fade in timeout={520} appear>
                        <Box
                          sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "100%",
                            px: 0,
                          }}
                        >
                          <Card
                            variant="outlined"
                            sx={{
                              width: "100%",
                              borderRadius: "16px",
                              bgcolor: "rgba(28, 31, 36, 0.94)",
                              borderColor: "rgba(255,255,255,0.22)",
                              overflow: "hidden",
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                              boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
                            }}
                          >
                            <CardContent
                              sx={{
                                p: 2,
                                width: "100%",
                                boxSizing: "border-box",
                                textAlign: "center",
                              }}
                            >
                              <EmojiEventsIcon
                                sx={{
                                  fontSize: 40,
                                  color: "#cd7f32",
                                  mb: 0.75,
                                  display: "block",
                                  mx: "auto",
                                }}
                                aria-hidden
                              />
                              <Typography
                                sx={{
                                  color: BRAND_ACCENT,
                                  fontWeight: 800,
                                  fontSize: 22,
                                  lineHeight: 1.2,
                                  mb: 0.5,
                                }}
                              >
                                3 место
                              </Typography>
                              <Typography
                                sx={{ color: "#fff", fontWeight: 600, fontSize: 15, mb: 1 }}
                              >
                                {DEMO_PHONE_THIRD_PLACE.name}
                              </Typography>
                              <Typography
                                sx={{
                                  color: "rgba(255,255,255,0.75)",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                }}
                              >
                                {DEMO_PHONE_THIRD_PLACE.score.toLocaleString("ru-RU")} баллов ·{" "}
                                {DEMO_PHONE_THIRD_PLACE.correct} верных ·{" "}
                                {DEMO_PHONE_THIRD_PLACE.time}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                      </Fade>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
          {screenOverlay ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                px: 0.5,
              }}
            >
              {screenOverlay}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

export function LandingPage() {
  return (
    <BrandPageLayout documentTitle="Meyouquize — интерактивные квизы и голосования для мероприятий">
      <BrandHeader />
      <DemoSceneSection />
      <CtaSection />
      <BrandFooter />
    </BrandPageLayout>
  );
}

type DemoQuizScenarioTabProps = {
  sectionRef: RefObject<HTMLElement | null>;
  demoTabRef: MutableRefObject<number>;
};

function DemoQuizScenarioTab({ sectionRef, demoTabRef }: DemoQuizScenarioTabProps) {
  const { sceneIndex, sceneProgress } = useDemoScenarioWheel({
    sectionRef,
    demoTabRef,
    activeDemoTabIndex: DEMO_TAB_QUIZ,
    maxSceneIndex: DEMO_SCENE_COUNT - 1,
  });

  const lastQuizScene = 2 + DEMO_QUIZ_POLLS.length * 3 - 1;
  const quizBlockIndex =
    sceneIndex >= 2 && sceneIndex <= lastQuizScene ? Math.floor((sceneIndex - 2) / 3) : -1;
  const blockStart = quizBlockIndex >= 0 ? 2 + quizBlockIndex * 3 : -1;
  const withinBlockOffset = quizBlockIndex >= 0 ? sceneIndex - blockStart : -1;

  let projectorVotePoll: (typeof DEMO_QUIZ_POLLS)[number] | null = null;
  let projectorResultPoll: (typeof DEMO_QUIZ_POLLS)[number] | null = null;
  for (let i = 0; i < DEMO_QUIZ_POLLS.length; i++) {
    const s = 2 + i * 3;
    if (sceneIndex === s) {
      projectorVotePoll = DEMO_QUIZ_POLLS[i];
    }
    if (sceneIndex === s + 1 || sceneIndex === s + 2) {
      projectorResultPoll = DEMO_QUIZ_POLLS[i];
    }
  }

  const projectorResultsUpdated = withinBlockOffset === 2;
  const projectorResultsArr = projectorResultPoll
    ? projectorResultsUpdated
      ? projectorResultPoll.resultsAfter
      : projectorResultPoll.results
    : DEMO_QUIZ_POLLS[0].results;
  const projectorHighlightSelected = projectorResultsUpdated;
  const userPickIndices = projectorResultPoll?.demoSelectedIndices ?? [];

  let projectorFadeKey = "p-intro";
  if (sceneIndex >= DEMO_LEADERBOARD_SCENE_INDEX) {
    projectorFadeKey = "p-leaderboard";
  } else if (sceneIndex >= 2 && sceneIndex <= lastQuizScene) {
    for (let i = 0; i < DEMO_QUIZ_POLLS.length; i++) {
      const s = 2 + i * 3;
      if (sceneIndex === s) {
        projectorFadeKey = `p-vote-q${i + 1}`;
        break;
      }
      if (sceneIndex === s + 1 || sceneIndex === s + 2) {
        projectorFadeKey = `p-results-q${i + 1}`;
        break;
      }
    }
  }

  return (
    <LandingDemoScenarioShell
      sceneProgress={sceneProgress}
      sceneIndex={sceneIndex}
      captionPairs={DEMO_TITRE_PAIRS}
      phoneSlot={<DemoQuizPhoneColumn sceneIndex={sceneIndex} />}
      projectorSlot={
        <Box
          sx={{ flex: 1, width: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <Fade in key={projectorFadeKey} timeout={420}>
            <Box
              sx={{
                width: "100%",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "center",
              }}
            >
              {sceneIndex < 2 ? (
                <DemoQuizProjectorQrSlideBody />
              ) : sceneIndex >= DEMO_LEADERBOARD_SCENE_INDEX ? (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <ProjectorLeaderboardTable
                    leaders={DEMO_PROJECTOR_LEADERS}
                    winnersRowsCount={3}
                    fadeKey={sceneIndex}
                    brandPrimaryColor={BRAND_ACCENT}
                    embedded
                  />
                </Box>
              ) : projectorVotePoll ? (
                <Stack spacing={3} sx={{ width: "100%" }}>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: { xs: "1.35rem", md: "3rem" },
                      lineHeight: 1.15,
                      textAlign: "center",
                      pt: { xs: 1, md: 0 },
                    }}
                  >
                    {projectorVotePoll.question}
                  </Typography>
                  {projectorVotePoll.maxPicks > 1 && (
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.72)",
                        fontSize: { xs: 15, md: 18 },
                        textAlign: "center",
                        mt: -1.5,
                      }}
                    >
                      Выберите {projectorVotePoll.maxPicks} варианта
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    {projectorVotePoll.options.map((option) => (
                      <Box
                        key={option}
                        sx={{
                          height: { xs: 54, md: 66 },
                          borderRadius: "16px",
                          border: "1px solid rgba(255,255,255,0.35)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: { xs: 22, md: 34 },
                          fontWeight: 400,
                          lineHeight: 1,
                        }}
                      >
                        {option}
                      </Box>
                    ))}
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ width: "100%", maxWidth: 980 }}>
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: { xs: "1.3rem", md: "2.2rem" },
                      lineHeight: 1.15,
                    }}
                  >
                    {projectorResultPoll?.question}
                  </Typography>
                  <Stack spacing={1}>
                    {projectorResultsArr.map((item, index) => {
                      const picks = userPickIndices as readonly number[];
                      const correct = (projectorResultPoll?.correctIndices ??
                        []) as readonly number[];
                      const isUserPick = picks.includes(index);
                      const isCorrect = correct.includes(index);
                      const barUserHighlight = projectorHighlightSelected && isUserPick;
                      return (
                        <Box key={item.label}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 0.4 }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.75}
                              sx={{ minWidth: 0, pr: 1 }}
                            >
                              <Typography
                                sx={{
                                  color: "#fff",
                                  fontWeight: barUserHighlight ? 700 : 600,
                                  ...(barUserHighlight && {
                                    textShadow: `0 0 20px rgba(243, 247, 34, 0.35)`,
                                  }),
                                }}
                              >
                                {item.label}
                              </Typography>
                              {isCorrect && projectorResultsUpdated && (
                                <Fade
                                  in
                                  appear
                                  timeout={480}
                                  style={{ transitionDelay: `${0.35 + index * 0.06}s` }}
                                >
                                  <Box
                                    component="span"
                                    sx={{ display: "inline-flex", lineHeight: 0 }}
                                  >
                                    <CheckCircleIcon
                                      sx={{
                                        fontSize: { xs: 15, md: 17 },
                                        color: PROJECTOR_CORRECT_GREEN,
                                        flexShrink: 0,
                                      }}
                                      aria-hidden
                                    />
                                  </Box>
                                </Fade>
                              )}
                            </Stack>
                            <Typography
                              sx={{
                                color: "#fff",
                                fontWeight: barUserHighlight ? 700 : 400,
                                flexShrink: 0,
                                ...(barUserHighlight && { color: BRAND_ACCENT }),
                              }}
                            >
                              {item.pct}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={item.pct}
                            sx={{
                              height: 12,
                              borderRadius: 99,
                              bgcolor: "rgba(255,255,255,0.15)",
                              ...(barUserHighlight && {
                                boxShadow: `0 0 0 1px rgba(243, 247, 34, 0.45), 0 0 18px rgba(243, 247, 34, 0.2)`,
                              }),
                              "& .MuiLinearProgress-bar": {
                                bgcolor: barUserHighlight ? BRAND_ACCENT : "rgba(255,255,255,0.55)",
                                transition:
                                  "transform 1.15s cubic-bezier(0.22, 0.78, 0.2, 1), background-color 0.55s ease 0.15s, box-shadow 0.45s ease",
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              )}
            </Box>
          </Fade>
        </Box>
      }
    />
  );
}

function LandingDemoSpeakerTab({ sectionRef, demoTabRef }: LandingDemoScenarioTabProps) {
  const { sceneIndex, sceneProgress } = useDemoScenarioWheel({
    sectionRef,
    demoTabRef,
    activeDemoTabIndex: DEMO_TAB_SPEAKER_QUESTIONS,
    maxSceneIndex: 0,
  });
  const speakerDemoPhoneSceneIndex = 1;

  return (
    <LandingDemoScenarioShell
      description="Вопросы из зала попадают на экран: к кому адресовано, текст и статус — без хаоса в чате."
      sceneProgress={sceneProgress}
      sceneIndex={sceneIndex}
      captionPairs={DEMO_SPEAKER_QUESTIONS_TITRE_PAIRS}
      phoneSlot={<DemoQuizPhoneColumn sceneIndex={speakerDemoPhoneSceneIndex} />}
      projectorSlot={
        <Fade in key="p-intro" timeout={420}>
          <Box
            sx={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            <DemoQuizProjectorQrSlideBody />
          </Box>
        </Fade>
      }
    />
  );
}

function LandingDemoReactionsTab({ sectionRef, demoTabRef }: LandingDemoScenarioTabProps) {
  const { sceneIndex, sceneProgress } = useDemoScenarioWheel({
    sectionRef,
    demoTabRef,
    activeDemoTabIndex: DEMO_TAB_REACTIONS,
    maxSceneIndex: 0,
  });
  const reactionsDemoPhoneSceneIndex = 1;

  return (
    <LandingDemoScenarioShell
      description="Мгновенные реакции с телефонов — на проекторе видно настроение зала в реальном времени."
      sceneProgress={sceneProgress}
      sceneIndex={sceneIndex}
      captionPairs={DEMO_REACTIONS_TITRE_PAIRS}
      phoneSlot={<DemoQuizPhoneColumn sceneIndex={reactionsDemoPhoneSceneIndex} />}
      projectorSlot={
        <Fade in key="p-reactions-landing" timeout={420}>
          <Box
            sx={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            <DemoQuizProjectorReactionsSlideBody />
          </Box>
        </Fade>
      }
    />
  );
}

function LandingDemoRandomizerTab({ sectionRef, demoTabRef }: LandingDemoScenarioTabProps) {
  const { sceneIndex, sceneProgress } = useDemoScenarioWheel({
    sectionRef,
    demoTabRef,
    activeDemoTabIndex: DEMO_TAB_RANDOMIZER,
    maxSceneIndex: 0,
  });
  const randomizerPhoneSceneIndex = 1;

  return (
    <LandingDemoScenarioShell
      description="Честный розыгрыш: имена или номера билетов на экране — без споров «кто выиграл»."
      sceneProgress={sceneProgress}
      sceneIndex={sceneIndex}
      captionPairs={DEMO_RANDOMIZER_TITRE_PAIRS}
      phoneSlot={<DemoQuizPhoneColumn sceneIndex={randomizerPhoneSceneIndex} />}
      projectorSlot={
        <Stack
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ height: "100%", textAlign: "center" }}
        >
          <Typography
            sx={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Рандомайзер
          </Typography>
          <Typography
            sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: "1.35rem", md: "2rem" } }}
          >
            Победитель
          </Typography>
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              border: `2px solid ${BRAND_ACCENT}`,
              boxShadow: `0 0 24px rgba(243,247,34,0.25)`,
              bgcolor: "rgba(243,247,34,0.08)",
            }}
          >
            <Typography
              sx={{
                color: BRAND_ACCENT,
                fontWeight: 800,
                fontSize: { xs: "1.5rem", md: "2.25rem" },
              }}
            >
              Екатерина · билет #1842
            </Typography>
          </Box>
        </Stack>
      }
    />
  );
}

function DemoSceneSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const demoTabRef = useRef(0);
  const [demoTab, setDemoTab] = useState(0);

  useLayoutEffect(() => {
    demoTabRef.current = demoTab;
  }, [demoTab]);

  return (
    <Box
      id="demo"
      ref={sectionRef}
      component="section"
      sx={{
        pt: { xs: 3, md: 4 },
        pb: { xs: 6, md: 8 },
        borderBottom: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={demoTab}
            onChange={(_, value) => setDemoTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: BRAND_BORDER,
              "& .MuiTab-root": {
                color: "rgba(255,255,255,0.65)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: { xs: "0.88rem", sm: "0.95rem" },
                minHeight: 44,
              },
              "& .Mui-selected": { color: BRAND_ACCENT },
              "& .MuiTabs-indicator": { bgcolor: BRAND_ACCENT },
            }}
          >
            <Tab label="Квиз" />
            <Tab label="Вопросы спикерам" />
            <Tab label="Реакции" />
            <Tab label="Облако тегов" />
            <Tab label="Рандомайзер" />
          </Tabs>
        </Box>

        <Box sx={{ display: demoTab === 0 ? "block" : "none" }}>
          <DemoQuizScenarioTab sectionRef={sectionRef} demoTabRef={demoTabRef} />
        </Box>
        <Box sx={{ display: demoTab === 1 ? "block" : "none" }}>
          <LandingDemoSpeakerTab sectionRef={sectionRef} demoTabRef={demoTabRef} />
        </Box>
        <Box sx={{ display: demoTab === 2 ? "block" : "none" }}>
          <LandingDemoReactionsTab sectionRef={sectionRef} demoTabRef={demoTabRef} />
        </Box>
        <Box sx={{ display: demoTab === 3 ? "block" : "none" }}>
          <LandingDemoTagCloudTab sectionRef={sectionRef} demoTabRef={demoTabRef} />
        </Box>
        <Box sx={{ display: demoTab === 4 ? "block" : "none" }}>
          <LandingDemoRandomizerTab sectionRef={sectionRef} demoTabRef={demoTabRef} />
        </Box>
      </Container>
    </Box>
  );
}

function CtaSection() {
  return (
    <Box id="request" component="section" sx={{ py: { xs: 8, md: 12 } }}>
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
              background: `radial-gradient(circle at 50% 0%, rgba(243,247,34,0.16), rgba(243,247,34,0) 60%)`,
              pointerEvents: "none",
            }}
          />
          <Stack alignItems="center" spacing={3} sx={{ position: "relative" }}>
            <Typography variant="h3" sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" } }}>
              Понравился сценарий?
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 520 }}>
              Оставьте заявку, и мы подготовим для вас рабочий ивент с брендингом, вопросами
              спикеру, голосованием и квизом под формат вашей аудитории.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
            >
              <Button
                component="a"
                href="mailto:hello@meyouquize.ru?subject=Заявка%20на%20демо%20ивент"
                variant="contained"
                color="primary"
                size="large"
              >
                Оставить заявку
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
