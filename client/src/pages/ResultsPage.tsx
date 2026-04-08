import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Container,
  Fade,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { animated, to, useTransition } from "@react-spring/web";
import cloud from "d3-cloud";
import { normalizePublicViewState, type PublicViewMode, type PublicViewPayload } from "@meyouquize/shared";
import { buildCloudWordsForDisplay } from "../features/tagCloudMerge";
import {
  ADMIN_PROJECTOR_BACKGROUND_IMAGE,
  ADMIN_DEFAULT_PROJECTOR_BACKGROUND,
  isAdminDefaultProjectorBackground,
} from "../projectorBackgroundAdmin";
import { socket } from "../socket";
import "../styles/adminProjectorBody.css";

type OptionStat = { optionId: string; text: string; count: number; isCorrect: boolean };
type TagCloudWord = { text: string; count: number };
type LayoutWord = { text: string; count: number; size: number; x: number; y: number; rotate: number };
type QuestionResult = {
  questionId: string;
  text: string;
  subQuizId?: string | null;
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  type?: "single" | "multi" | "tag_cloud";
  optionStats: OptionStat[];
  tagCloud?: TagCloudWord[];
  firstCorrectNicknames?: string[];
};
type Leader = { participantId: string; nickname: string; score: number };
function colorByWord(word: string, palette: string[]) {
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) hash = ((hash << 5) - hash) + word.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length] ?? "#1f1f1f";
}

function QuestionChart(props: {
  question: QuestionResult;
  showVoteCount: boolean;
  fillHeight?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: Array<{ text: string; count: number }>;
  tagCountOverrides?: Array<{ text: string; count: number }>;
  cloudTagColors?: string[];
  cloudTopTagColor?: string;
  cloudDensity?: number;
  cloudTagPadding?: number;
  cloudSpiral?: "archimedean" | "rectangular";
  cloudAnimationStrength?: number;
  voteOptionTextColor?: string;
  voteProgressTrackColor?: string;
  voteProgressBarColor?: string;
}) {
  const {
    question,
    showVoteCount,
    fillHeight = false,
    hiddenTagTexts = [],
    injectedTagWords = [],
    tagCountOverrides = [],
    cloudTagColors = ["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"],
    cloudTopTagColor = "#d32f2f",
    cloudDensity = 60,
    cloudTagPadding = 5,
    cloudSpiral = "archimedean",
    cloudAnimationStrength = 30,
    voteOptionTextColor = "#1f1f1f",
    voteProgressTrackColor = "#e3e3e3",
    voteProgressBarColor = "#1976d2",
  } = props;
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([]);
  const [cloudSize, setCloudSize] = useState({ width: 920, height: 440 });
  const cloudContainerRef = useRef<HTMLDivElement | null>(null);

  const isTagCloud = question.type === "tag_cloud" || question.optionStats.length === 0;
  const sourceWords = useMemo(
    () => buildCloudWordsForDisplay({
      liveTags: question.tagCloud ?? [],
      hiddenTagTexts,
      injectedTagWords,
      tagCountOverrides,
    }),
    [hiddenTagTexts, injectedTagWords, question.tagCloud, tagCountOverrides],
  );
  const hasTagWords = sourceWords.length > 0;
  const maxTagCount = useMemo(
    () => (sourceWords.length > 0 ? Math.max(...sourceWords.map((item) => item.count)) : 0),
    [sourceWords],
  );
  const hasBarData = question.optionStats.length > 0;
  const hasData = isTagCloud ? hasTagWords : hasBarData;
  const animationStrength = Math.max(0, Math.min(100, cloudAnimationStrength));
  const transitions = useTransition(isTagCloud ? layoutWords : [], {
    keys: (item) => item.text,
    from: (item) => ({
      x: item.x * 0.35,
      y: item.y * 0.35,
      scale: 0.65,
      opacity: 0,
      size: item.size * 0.82,
    }),
    enter: (item) => ({
      x: item.x,
      y: item.y,
      scale: 1,
      opacity: 1,
      size: item.size,
    }),
    update: (item) => ({
      x: item.x,
      y: item.y,
      scale: 1,
      opacity: 1,
      size: item.size,
    }),
    leave: {
      scale: 0.5,
      opacity: 0,
    },
    config: {
      mass: 1.2,
      tension: 100 + animationStrength * 2.2,
      friction: Math.max(12, 34 - animationStrength * 0.14),
    },
  }) as any;

  useEffect(() => {
    if (!isTagCloud) return;
    const node = cloudContainerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setCloudSize({
        width: Math.max(360, Math.floor(rect.width)),
        height: Math.max(300, Math.floor(rect.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isTagCloud, fillHeight]);

  useEffect(() => {
    if (!isTagCloud || !hasTagWords) {
      setLayoutWords([]);
      return;
    }
    const min = Math.min(...sourceWords.map((item) => item.count));
    const max = Math.max(...sourceWords.map((item) => item.count));
    const wordCount = sourceWords.length;
    const sparseBoost = Math.max(1, Math.min(1.75, 1.75 - wordCount * 0.06));
    const fontSize = (count: number, text: string) => {
      const tLinear = max === min ? 1 : (count - min) / (max - min);
      /* gamma < 1: лидер менее доминирует; узкий диапазон px — меньше контраст с хвостом */
      const t = Math.pow(Math.max(0, Math.min(1, tLinear)), 0.72);
      const base = max === min ? 60 : 24 + t * 44;
      const lengthPenalty = Math.max(0.68, 1 - Math.max(0, text.length - 10) * 0.018);
      return Math.round(base * sparseBoost * lengthPenalty);
    };

    const layoutW = Math.max(320, cloudSize.width - 40);
    const layoutH = Math.max(260, cloudSize.height - 40);
    const layout = cloud<LayoutWord>()
      .size([layoutW, layoutH])
      .words(sourceWords.map((word) => ({
        text: word.text.toLocaleUpperCase("ru-RU"),
        count: word.count,
        size: fontSize(word.count, word.text),
        x: 0,
        y: 0,
        rotate: 0,
      })))
      /* padding в d3-cloud — зазор между ограничивающими прямоугольниками; часть от размера шрифта, чтобы крупные слова не слипались */
      .padding((d) => {
        const w = d as LayoutWord;
        return cloudTagPadding + Math.min(28, Math.round((w.size ?? 16) * 0.14));
      })
      .rotate(() => 0)
      .font("Roboto, Arial, sans-serif")
      .fontWeight("700")
      .fontSize((word) => word.size)
      .spiral(cloudSpiral)
      .on("end", (words: LayoutWord[]) => setLayoutWords(words));

    layout.start();
    return () => {
      layout.stop();
    };
  }, [
    cloudAnimationStrength,
    cloudDensity,
    cloudSize.height,
    cloudSize.width,
    cloudSpiral,
    cloudTagPadding,
    hasTagWords,
    isTagCloud,
    sourceWords,
  ]);

  const voteRows = useMemo(() => {
    if (question.type === "tag_cloud" || question.optionStats.length === 0) return [];
    /** При 0% на треке всё равно показываем тонкую заливку, чтобы бегунок был заметен */
    const minBarDisplayPercent = 1.75;
    const total = question.optionStats.reduce((sum, item) => sum + item.count, 0);
    return question.optionStats.map((o) => {
      const percent = total > 0 ? (o.count / total) * 100 : 0;
      const barDisplayPercent = percent > 0 ? percent : minBarDisplayPercent;
      const percentLabel = showVoteCount ? `${percent.toFixed(1)}% (${o.count})` : `${percent.toFixed(1)}%`;
      const optionLabelSx = {
        whiteSpace: "pre-wrap" as const,
        wordBreak: "break-word" as const,
        textTransform: "uppercase" as const,
        color: voteOptionTextColor,
      };
      const statSx = { color: voteOptionTextColor, fontWeight: 600 };
      const barSx = {
        height: 16,
        borderRadius: 99,
        overflow: "hidden",
        bgcolor: voteProgressTrackColor,
        "& .MuiLinearProgress-bar": {
          borderRadius: 99,
          bgcolor: voteProgressBarColor,
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      };
      return { optionId: o.optionId, text: o.text, percent, barDisplayPercent, percentLabel, optionLabelSx, statSx, barSx };
    });
  }, [question.type, question.optionStats, showVoteCount, voteOptionTextColor, voteProgressTrackColor, voteProgressBarColor]);

  if (!hasData) {
    return (
      <Paper
        sx={{
          p: 0,
          minHeight: isTagCloud ? (fillHeight ? `${cloudSize.height}px` : 460) : 420,
          height: isTagCloud && fillHeight ? `${cloudSize.height}px` : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          boxShadow: "none",
          bgcolor: "transparent",
        }}
      >
        <Typography color="text.secondary" align="center">
          Пока нет ответов
        </Typography>
      </Paper>
    );
  }

  if (isTagCloud) {
    // 0..100: 0 = максимально разреженно, 100 = максимально плотно.
    const safeDensity = Math.max(0, Math.min(100, cloudDensity));
    const spreadFactor = 1.3 - (safeDensity / 100) * 0.55;

    return (
      <Paper
        sx={{
          p: 0,
          border: 0,
          boxShadow: "none",
          bgcolor: "transparent",
          height: fillHeight ? "100%" : 440,
          minHeight: fillHeight ? 0 : 300,
        }}
      >
        <Box ref={cloudContainerRef} sx={{ position: "relative", height: "100%", minHeight: "100%", overflow: "hidden", px: 1 }}>
          {transitions((style: any, item: LayoutWord) => (
            <animated.span
              key={item.text}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                opacity: style.opacity,
                fontSize: style.size.to((v: number) => `${v}px`),
                fontWeight: 700,
                fontFamily: "Roboto, Arial, sans-serif",
                lineHeight: 1.1,
                color: item.count === maxTagCount ? cloudTopTagColor : colorByWord(item.text, cloudTagColors),
                whiteSpace: "nowrap",
                textAlign: "center",
                userSelect: "none",
                pointerEvents: "none",
                transform: to(
                  [style.x, style.y, style.scale],
                  (x, y, s) => {
                    /* Без усечения координат: иначе несколько слов у края получают одинаковый clamp и визуально накладываются. Обрезка — overflow: hidden у контейнера. */
                    const spreadX = x * spreadFactor;
                    const spreadY = y * spreadFactor;
                    return `translate(-50%, -50%) translate(${spreadX}px, ${spreadY}px) scale(${s})`;
                  },
                ),
              }}
            >
              {item.text}
            </animated.span>
          ))}
        </Box>
      </Paper>
    );
  }

  const gridColumnsSx = {
    display: { xs: "none", md: "grid" },
    width: "100%",
    gridTemplateColumns: "minmax(0, 25%) 1fr auto",
    columnGap: 2,
    rowGap: 1.5,
    alignItems: "center",
    bgcolor: "transparent",
  } as const;

  return (
    <Box sx={{ p: 0, width: "100%", bgcolor: "transparent" }}>
      {/* Узкий экран: по строке на вариант */}
      <Stack spacing={2} sx={{ width: "100%", display: { xs: "flex", md: "none" }, bgcolor: "transparent" }}>
        {voteRows.map((row) => (
          <Box key={row.optionId} sx={{ py: 0.5, width: "100%", minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.75, gap: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  ...row.optionLabelSx,
                  pr: 2,
                  maxWidth: "25%",
                  minWidth: 0,
                  flexShrink: 1,
                  overflowWrap: "anywhere",
                }}
              >
                {row.text}
              </Typography>
              <Typography variant="h6" sx={{ ...row.statSx, flexShrink: 0 }}>{row.percentLabel}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={row.barDisplayPercent}
              aria-valuenow={Math.round(row.percent)}
              sx={row.barSx}
            />
          </Box>
        ))}
      </Stack>

      {/* Десктоп: грид — ответы (≤25%) | треки (1fr) | проценты */}
      <Box sx={gridColumnsSx}>
        {voteRows.map((row) => (
          <Fragment key={row.optionId}>
            <Box sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
              <Typography variant="h6" sx={{ ...row.optionLabelSx, overflowWrap: "anywhere" }}>{row.text}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={row.barDisplayPercent}
              aria-valuenow={Math.round(row.percent)}
              sx={{ ...row.barSx, width: "100%", minWidth: 0 }}
            />
            <Typography variant="h6" sx={{ ...row.statSx, textAlign: "right", whiteSpace: "nowrap", pl: 1 }}>
              {row.percentLabel}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

export function ResultsPage() {
  const { slug = "" } = useParams();
  const [questions, setQuestions] = useState<QuestionResult[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [quizTitle, setQuizTitle] = useState("Квиз");
  const [publicViewMode, setPublicViewMode] = useState<PublicViewMode>("title");
  const [publicQuestionId, setPublicQuestionId] = useState<string | undefined>(undefined);
  const [highlightedLeadersCount, setHighlightedLeadersCount] = useState(3);
  const [showVoteCount, setShowVoteCount] = useState(true);
  const [showQuestionTitle, setShowQuestionTitle] = useState(true);
  const [hiddenTagTexts, setHiddenTagTexts] = useState<string[]>([]);
  const [injectedTagWords, setInjectedTagWords] = useState<Array<{ text: string; count: number }>>([]);
  const [tagCountOverrides, setTagCountOverrides] = useState<Array<{ text: string; count: number }>>([]);
  const [projectorBackground, setProjectorBackground] = useState(ADMIN_DEFAULT_PROJECTOR_BACKGROUND);
  const [cloudQuestionColor, setCloudQuestionColor] = useState("#1f1f1f");
  const [cloudTagColors, setCloudTagColors] = useState<string[]>(["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"]);
  const [cloudTopTagColor, setCloudTopTagColor] = useState("#d32f2f");
  const [cloudDensity, setCloudDensity] = useState(60);
  const [cloudTagPadding, setCloudTagPadding] = useState(5);
  const [cloudSpiral, setCloudSpiral] = useState<"archimedean" | "rectangular">("archimedean");
  const [cloudAnimationStrength, setCloudAnimationStrength] = useState(30);
  const [voteQuestionTextColor, setVoteQuestionTextColor] = useState("#1f1f1f");
  const [voteOptionTextColor, setVoteOptionTextColor] = useState("#1f1f1f");
  const [voteProgressTrackColor, setVoteProgressTrackColor] = useState("#e3e3e3");
  const [voteProgressBarColor, setVoteProgressBarColor] = useState("#1976d2");
  const [showFirstCorrectAnswerer, setShowFirstCorrectAnswerer] = useState(false);
  const [firstCorrectWinnersCount, setFirstCorrectWinnersCount] = useState(1);
  const [resultsAnimationTick, setResultsAnimationTick] = useState(0);

  useEffect(() => {
    if (!slug) return;
    if (!socket.connected) socket.connect();
    const onDashboard = (payload: { perQuestion: QuestionResult[]; leaderboard: Leader[] }) => {
      setQuestions(payload.perQuestion);
      setLeaders(payload.leaderboard);
    };
    const onPublicView = (payload: PublicViewPayload) => {
      const view = normalizePublicViewState(payload);
      setPublicViewMode(view.mode);
      setPublicQuestionId(view.questionId);
      if (payload.title?.trim()) setQuizTitle(payload.title);
      setHighlightedLeadersCount(view.highlightedLeadersCount);
      setShowVoteCount(view.showVoteCount);
      setShowQuestionTitle(view.showQuestionTitle);
      setHiddenTagTexts(view.hiddenTagTexts);
      setInjectedTagWords(view.injectedTagWords);
      setTagCountOverrides(view.tagCountOverrides);
      setProjectorBackground(view.projectorBackground);
      setCloudQuestionColor(view.cloudQuestionColor);
      setCloudTagColors(view.cloudTagColors);
      setCloudTopTagColor(view.cloudTopTagColor);
      setCloudDensity(view.cloudDensity);
      setCloudTagPadding(view.cloudTagPadding);
      setCloudSpiral(view.cloudSpiral);
      setCloudAnimationStrength(view.cloudAnimationStrength);
      setVoteQuestionTextColor(view.voteQuestionTextColor);
      setVoteOptionTextColor(view.voteOptionTextColor);
      setVoteProgressTrackColor(view.voteProgressTrackColor);
      setVoteProgressBarColor(view.voteProgressBarColor);
      setShowFirstCorrectAnswerer(view.showFirstCorrectAnswerer);
      setFirstCorrectWinnersCount(view.firstCorrectWinnersCount);
      console.info("[mq-winners] results:public:view", {
        mode: view.mode,
        questionId: view.questionId,
        showFirstCorrectAnswerer: view.showFirstCorrectAnswerer,
        firstCorrectWinnersCount: view.firstCorrectWinnersCount,
      });
    };
    const onError = (evt: { message: string }) => {
      console.error("[results-page] error:message", evt);
    };
    socket.on("results:dashboard", onDashboard);
    socket.on("results:public:view", onPublicView);
    socket.on("error:message", onError);
    socket.emit("results:subscribe", { slug });
    return () => {
      socket.off("results:dashboard", onDashboard);
      socket.off("results:public:view", onPublicView);
      socket.off("error:message", onError);
    };
  }, [slug]);

  /** Только лидерборд: при обновлении результатов вопроса не трогаем tick — иначе Fade/ремоунт даёт моргание голосования. */
  useEffect(() => {
    setResultsAnimationTick((prev) => prev + 1);
  }, [leaders]);

  useEffect(() => {
    const root = document.getElementById("root");
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyImg = document.body.style.backgroundImage;
    const prevBodyAtt = document.body.style.backgroundAttachment;
    const prevBodyOx = document.body.style.overflowX;
    const prevRootBg = root?.style.backgroundColor ?? "";
    const hadAdminClass = document.body.classList.contains("mq-admin-projector-bg");

    document.body.style.backgroundColor = projectorBackground;
    // Фон только на body (градиент/паттерн), #root прозрачен — лидерборд не на чёрной «подложке».
    if (root) root.style.backgroundColor = "transparent";

    const matchAdmin = isAdminDefaultProjectorBackground(projectorBackground);
    if (matchAdmin) {
      document.body.classList.add("mq-admin-projector-bg");
      document.body.style.backgroundImage = ADMIN_PROJECTOR_BACKGROUND_IMAGE;
      document.body.style.backgroundAttachment = "fixed";
      document.body.style.overflowX = "hidden";
    } else {
      document.body.classList.remove("mq-admin-projector-bg");
      document.body.style.backgroundImage = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.overflowX = "";
    }

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.backgroundImage = prevBodyImg;
      document.body.style.backgroundAttachment = prevBodyAtt;
      document.body.style.overflowX = prevBodyOx;
      if (root) root.style.backgroundColor = prevRootBg;
      if (hadAdminClass) document.body.classList.add("mq-admin-projector-bg");
      else document.body.classList.remove("mq-admin-projector-bg");
    };
  }, [projectorBackground]);

  const selectedQuestion =
    publicViewMode === "question" && publicQuestionId
      ? questions.find((q) => q.questionId === publicQuestionId)
      : undefined;
  /** Полноэкранное название ивента: явный title, или нет вопроса на экране, или пустая таблица без результатов. */
  const showEventTitleScreen =
    publicViewMode === "title"
    || (publicViewMode === "question" && !selectedQuestion)
    || (publicViewMode === "leaderboard" && leaders.length === 0);
  const isTagCloudQuestion = !!selectedQuestion && (selectedQuestion.type === "tag_cloud" || selectedQuestion.optionStats.length === 0);
  const fullScreenCloud = publicViewMode === "question" && isTagCloudQuestion;
  const fullScreenContainer = fullScreenCloud || showEventTitleScreen;
  const barQuestionCentered = publicViewMode === "question" && !!selectedQuestion && !fullScreenCloud;

  const firstCorrectWinnersShown = useMemo(() => {
    const raw = selectedQuestion?.firstCorrectNicknames ?? [];
    const standalone =
      selectedQuestion &&
      (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined) &&
      selectedQuestion.type !== "tag_cloud";
    const cap = standalone
      ? Math.max(
          1,
          Math.min(
            20,
            selectedQuestion.projectorFirstCorrectWinnersCount ?? firstCorrectWinnersCount,
          ),
        )
      : Math.max(1, Math.min(20, firstCorrectWinnersCount));
    return raw.slice(0, cap);
  }, [
    selectedQuestion?.firstCorrectNicknames,
    selectedQuestion?.subQuizId,
    selectedQuestion?.type,
    selectedQuestion?.projectorFirstCorrectWinnersCount,
    firstCorrectWinnersCount,
  ]);

  const showProjectorWinnersHero =
    publicViewMode === "question" &&
    !!selectedQuestion &&
    !isTagCloudQuestion &&
    showFirstCorrectAnswerer &&
    (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined) &&
    selectedQuestion.type !== "tag_cloud" &&
    selectedQuestion.projectorShowFirstCorrect !== false &&
    firstCorrectWinnersShown.length > 0;

  useEffect(() => {
    const reasons: Record<string, boolean | number | string | undefined> = {
      modeIsQuestion: publicViewMode === "question",
      hasSelectedQuestion: !!selectedQuestion,
      notTagCloudLayout: !isTagCloudQuestion,
      showFirstCorrectFlag: showFirstCorrectAnswerer,
      isStandalone:
        !!selectedQuestion &&
        (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined),
      typeOk: selectedQuestion?.type !== "tag_cloud",
      projectorAllowsFirstCorrect: selectedQuestion?.projectorShowFirstCorrect !== false,
      winnersCount: firstCorrectWinnersShown.length,
      rawNicknamesLen: selectedQuestion?.firstCorrectNicknames?.length ?? 0,
      publicQuestionId,
    };
    const willShow = showProjectorWinnersHero;
    console.info(`[mq-winners] hero ${willShow ? "SHOW" : "HIDE"}`, reasons);
    if (willShow) {
      console.info("[mq-winners] names on screen:", firstCorrectWinnersShown);
    }
  }, [
    showProjectorWinnersHero,
    publicViewMode,
    selectedQuestion,
    isTagCloudQuestion,
    showFirstCorrectAnswerer,
    firstCorrectWinnersShown,
    publicQuestionId,
  ]);

  /** Проектор / не полный экран: контент не шире 1920px по центру viewport */
  const containerContentMaxPx = 1920;

  return (
    <Container
      maxWidth={false}
      disableGutters={fullScreenContainer}
      sx={{
        bgcolor: "transparent",
        ...(!fullScreenContainer
          ? {
              width: "100%",
              maxWidth: containerContentMaxPx,
              mx: "auto",
              px: { xs: 2, sm: 3 },
              boxSizing: "border-box",
            }
          : {}),
        ...(showEventTitleScreen
          ? { minHeight: "100vh", width: "100vw", maxWidth: "none", display: "flex", alignItems: "center", justifyContent: "center", py: 0, px: 0, mx: 0 }
          : fullScreenCloud
            ? { minHeight: "100dvh", height: "100dvh", py: 0, px: 0, overflow: "hidden", maxWidth: "none", mx: 0 }
            : barQuestionCentered
              ? {
                  minHeight: "100dvh",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 2,
                  boxSizing: "border-box",
                }
              : { py: 4 }),
      }}
    >
      {showEventTitleScreen && (
        <Typography
          variant="h2"
          align="center"
          sx={{
            fontWeight: 700,
            px: 2,
            maxWidth: "min(95vw, 96rem)",
            mx: "auto",
            // Контраст к произвольному projectorBackground: инверсия по фону за текстом
            color: "#ffffff",
            mixBlendMode: "difference",
          }}
        >
          {quizTitle}
        </Typography>
      )}
      {publicViewMode === "leaderboard" && leaders.length > 0 && (
        <Box
          sx={{
            width: "100%",
            maxWidth: containerContentMaxPx,
            boxSizing: "border-box",
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            bgcolor: "transparent",
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Таблица результатов
          </Typography>
          <Fade in key={`leaders-${resultsAnimationTick}`} timeout={350}>
            <TableContainer sx={{ bgcolor: "transparent" }}>
              <Table
                size="medium"
                sx={{
                  tableLayout: "fixed",
                  bgcolor: "transparent",
                  "& .MuiTableCell-root": {
                    fontSize: { xs: "1rem", sm: "1.05rem" },
                    py: 1.5,
                    borderColor: "divider",
                  },
                }}
                aria-label="Таблица результатов"
              >
                <TableHead>
                  <TableRow sx={{ bgcolor: "transparent" }}>
                    <TableCell
                      scope="col"
                      sx={{
                        width: "14%",
                        minWidth: 72,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        bgcolor: "transparent",
                      }}
                    >
                      Позиция
                    </TableCell>
                    <TableCell scope="col" sx={{ fontWeight: 700, width: "62%", bgcolor: "transparent" }}>
                      Имя
                    </TableCell>
                    <TableCell
                      scope="col"
                      align="right"
                      sx={{
                        width: "24%",
                        minWidth: 88,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        bgcolor: "transparent",
                      }}
                    >
                      Балл
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaders.map((l, index) => {
                    const isHighlighted = index < highlightedLeadersCount;
                    const rowBg = isHighlighted
                      ? (theme: import("@mui/material").Theme) => {
                          if (index === 0) return { bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.28 : 0.18) };
                          if (index === 1) return { bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === "dark" ? 0.24 : 0.12) };
                          if (index === 2) return { bgcolor: alpha(theme.palette.warning.light, theme.palette.mode === "dark" ? 0.32 : 0.22) };
                          return { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08) };
                        }
                      : { bgcolor: "transparent" };
                    return (
                      <TableRow key={l.participantId} sx={rowBg}>
                        <TableCell sx={{ fontVariantNumeric: "tabular-nums", fontWeight: index < 3 ? 700 : 600 }}>
                          {index + 1}
                        </TableCell>
                        <TableCell
                          title={l.nickname}
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: index < 3 ? 600 : 400,
                          }}
                        >
                          {l.nickname}
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                          {l.score}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Fade>
        </Box>
      )}
      {publicViewMode === "question" && selectedQuestion && (
        <>
          <Stack
              spacing={showProjectorWinnersHero ? 2 : fullScreenCloud ? 2 : isTagCloudQuestion ? 2 : 5}
              sx={{
                width: "100%",
                ...(fullScreenCloud ? { height: "100%" } : {}),
                ...(!fullScreenCloud && !isTagCloudQuestion ? { alignItems: "center" } : {}),
                ...(showProjectorWinnersHero ? { flex: 1, minHeight: 0, justifyContent: "center" } : {}),
              }}
            >
              {showProjectorWinnersHero ? (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: "min(92vw, 640px)",
                    mx: "auto",
                    px: { xs: 1.5, sm: 2 },
                  }}
                >
                  <Typography
                    variant="h6"
                    align="center"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: voteQuestionTextColor,
                      opacity: 0.75,
                    }}
                  >
                    {selectedQuestion.text}
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      px: { xs: 3, sm: 5 },
                      py: { xs: 4, sm: 5 },
                      borderRadius: 4,
                      textAlign: "center",
                      border: "1px solid",
                      borderColor: (theme) => alpha(voteQuestionTextColor, theme.palette.mode === "dark" ? 0.28 : 0.22),
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? alpha(theme.palette.common.white, 0.06)
                          : alpha(theme.palette.common.black, 0.04),
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? `0 24px 48px ${alpha("#000", 0.35)}`
                          : `0 20px 40px ${alpha("#000", 0.08)}`,
                    }}
                  >
                    <Stack alignItems="center" spacing={2.5}>
                      <Box
                        sx={{
                          width: { xs: 72, sm: 96 },
                          height: { xs: 72, sm: 96 },
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: (theme) =>
                            `linear-gradient(145deg, ${alpha("#ffc107", theme.palette.mode === "dark" ? 0.35 : 0.5)} 0%, ${alpha("#ff9800", theme.palette.mode === "dark" ? 0.22 : 0.35)} 100%)`,
                          border: "2px solid",
                          borderColor: (theme) => alpha("#ffb300", theme.palette.mode === "dark" ? 0.65 : 0.85),
                          boxShadow: `0 8px 24px ${alpha("#ff9800", 0.35)}`,
                        }}
                      >
                        <EmojiEventsIcon
                          sx={{
                            fontSize: { xs: 40, sm: 52 },
                            color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#f57c00"),
                          }}
                        />
                      </Box>
                      <Typography
                        variant="overline"
                        sx={{
                          letterSpacing: "0.22em",
                          fontWeight: 700,
                          color: voteQuestionTextColor,
                          opacity: 0.8,
                        }}
                      >
                        {firstCorrectWinnersShown.length === 1
                          ? "Первый верно ответил"
                          : `Первые верно ответившие · ${firstCorrectWinnersShown.length}`}
                      </Typography>
                      {firstCorrectWinnersShown.length === 1 ? (
                        <Typography
                          variant="h3"
                          align="center"
                          sx={{
                            fontWeight: 800,
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                            color: voteQuestionTextColor,
                          }}
                        >
                          {firstCorrectWinnersShown[0]}
                        </Typography>
                      ) : (
                        <Stack spacing={1.25} sx={{ width: "100%" }}>
                          {firstCorrectWinnersShown.map((name, i) => (
                            <Box
                              key={`${i}-${name}`}
                              sx={{
                                display: "flex",
                                alignItems: "baseline",
                                justifyContent: "center",
                                gap: 1.5,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                component="span"
                                variant="h5"
                                sx={{
                                  fontWeight: 800,
                                  fontVariantNumeric: "tabular-nums",
                                  color: voteQuestionTextColor,
                                  opacity: 0.65,
                                  minWidth: "1.25em",
                                }}
                              >
                                {i + 1}.
                              </Typography>
                              <Typography
                                component="span"
                                variant="h4"
                                sx={{ fontWeight: 700, wordBreak: "break-word", color: voteQuestionTextColor }}
                              >
                                {name}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                </Box>
              ) : (
                <>
                  {(!isTagCloudQuestion || showQuestionTitle) && (
                    <Typography
                      variant="h3"
                      align="center"
                      sx={{
                        fontWeight: 700,
                        mb: fullScreenCloud || isTagCloudQuestion ? 1 : 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        px: fullScreenCloud ? 2 : 0,
                        pt: fullScreenCloud ? 2 : 0,
                        color: isTagCloudQuestion ? cloudQuestionColor : voteQuestionTextColor,
                        ...(!fullScreenCloud && !isTagCloudQuestion ? { width: "100%" } : {}),
                      }}
                    >
                      {selectedQuestion.text}
                    </Typography>
                  )}
                  <Fade in key={`question-${selectedQuestion.questionId}`} timeout={350}>
                    <Stack
                      sx={
                        fullScreenCloud
                          ? { width: "100%", flex: 1, minHeight: 0, pb: 1 }
                          : { width: "100%" }
                      }
                    >
                      <QuestionChart
                        question={selectedQuestion}
                        showVoteCount={showVoteCount}
                        fillHeight={fullScreenCloud}
                        hiddenTagTexts={hiddenTagTexts}
                        injectedTagWords={injectedTagWords}
                        tagCountOverrides={tagCountOverrides}
                        cloudTagColors={cloudTagColors}
                        cloudTopTagColor={cloudTopTagColor}
                        cloudDensity={cloudDensity}
                        cloudTagPadding={cloudTagPadding}
                        cloudSpiral={cloudSpiral}
                        cloudAnimationStrength={cloudAnimationStrength}
                        voteOptionTextColor={voteOptionTextColor}
                        voteProgressTrackColor={voteProgressTrackColor}
                        voteProgressBarColor={voteProgressBarColor}
                      />
                    </Stack>
                  </Fade>
                </>
              )}
            </Stack>
        </>
      )}
    </Container>
  );
}
