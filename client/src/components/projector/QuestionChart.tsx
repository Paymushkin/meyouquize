import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Box, Fade, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { animated, to, useTransition } from "@react-spring/web";
import cloud from "d3-cloud";
import { collectTagCloudCorrectAliases, normalizeTagComparable } from "@meyouquize/shared";
import { buildCloudWordsForDisplay } from "../../features/tagCloudMerge";
import { colorByWord } from "../../features/projectorChart/colorByWord";
import type { ProjectorLayoutWord, ProjectorQuestionResult } from "../../types/projectorDashboard";
import { resolveMuiFontFamily } from "../../utils/muiFontFamily";

const MIN_BAR_DISPLAY_PERCENT = 1.75;
const CORRECT_OPTION_COLOR = "#4caf50";
const DEFAULT_OUTLINE_COLOR = "rgba(255,255,255,0.35)";

/** Стабильные ссылки: иначе дефолт `= []` в параметрах даёт новый массив на каждый рендер и бесконечно перезапускает layout облака. */
const EMPTY_HIDDEN_TAGS: string[] = [];
const EMPTY_CLOUD_INJECT: Array<{ text: string; count: number }> = [];

function buildOptionLabelSx(voteOptionTextColor: string) {
  return {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    textTransform: "none" as const,
    color: voteOptionTextColor,
    fontWeight: 400,
  };
}

function buildStatSx(voteOptionTextColor: string) {
  return { color: voteOptionTextColor, fontWeight: 600 };
}

export type QuestionChartProps = {
  question: ProjectorQuestionResult;
  showVoteCount: boolean;
  showCorrectOption?: boolean;
  questionRevealStage?: "options" | "results";
  fillHeight?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: Array<{ text: string; count: number }>;
  tagCountOverrides?: Array<{ text: string; count: number }>;
  cloudTagColors?: string[];
  cloudTopTagColor?: string;
  cloudCorrectTagColor?: string;
  cloudDensity?: number;
  cloudTagPadding?: number;
  cloudSpiral?: "archimedean" | "rectangular";
  cloudAnimationStrength?: number;
  /** При пересчёте layout (d3-cloud) существующие теги прыгают на место без spring; анимация остаётся у новых (enter). */
  tagCloudSnapRelayout?: boolean;
  voteOptionTextColor?: string;
  voteProgressTrackColor?: string;
  voteProgressBarColor?: string;
  brandPrimaryColor?: string;
  /** Заголовок вопроса внутри блока облака (вместо отдельной строки над областью чарта) */
  cloudHeader?: ReactNode;
};

export function QuestionChart(props: QuestionChartProps) {
  const {
    question,
    showVoteCount,
    showCorrectOption = false,
    questionRevealStage = "results",
    fillHeight = false,
    hiddenTagTexts = EMPTY_HIDDEN_TAGS,
    injectedTagWords = EMPTY_CLOUD_INJECT,
    tagCountOverrides = EMPTY_CLOUD_INJECT,
    cloudTagColors = ["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"],
    cloudTopTagColor = "#d32f2f",
    cloudCorrectTagColor = "#2e7d32",
    cloudDensity = 60,
    cloudTagPadding = 5,
    cloudSpiral = "archimedean",
    cloudAnimationStrength = 30,
    tagCloudSnapRelayout = false,
    voteOptionTextColor = "#1f1f1f",
    voteProgressTrackColor = "#e3e3e3",
    voteProgressBarColor = "#1976d2",
    brandPrimaryColor = "#1976d2",
    cloudHeader,
  } = props;
  const theme = useTheme();
  const cloudFontFamily = resolveMuiFontFamily(theme);
  const [layoutWords, setLayoutWords] = useState<ProjectorLayoutWord[]>([]);
  const [cloudSize, setCloudSize] = useState({ width: 920, height: 440 });
  const cloudContainerRef = useRef<HTMLDivElement | null>(null);
  const cloudSizeRafRef = useRef(0);
  /** Последние применённые размеры — без этого ResizeObserver + пересчёт облака могут «дрожать» на 1px и зациклить layout. */
  const appliedCloudSizeRef = useRef({ width: 0, height: 0 });

  const isTagCloud = question.type === "tag_cloud";
  const sourceWords = useMemo(
    () =>
      buildCloudWordsForDisplay({
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
  const referenceComparableSet = useMemo(() => {
    if (question.type !== "tag_cloud") return null;
    const aliases = collectTagCloudCorrectAliases(
      question.optionStats.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    );
    return aliases.length > 0 ? new Set(aliases) : null;
  }, [question.type, question.optionStats]);
  const hasBarData = question.optionStats.length > 0;
  const hasRankingAnswers = question.type === "ranking" && hasBarData;
  /** На стадии options облако слов скрыто — только заголовок (cloudHeader); на results — при наличии тегов. */
  const tagCloudRenderable = isTagCloud && (questionRevealStage === "options" || hasTagWords);
  const hasData = isTagCloud
    ? tagCloudRenderable
    : question.type === "ranking"
      ? hasRankingAnswers
      : hasBarData;
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
      ...(tagCloudSnapRelayout ? { immediate: true as const } : {}),
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

    const readSize = () => {
      const rect = node.getBoundingClientRect();
      const rawW = Math.round(rect.width);
      const rawH = Math.round(rect.height);
      return {
        width: Math.max(360, rawW),
        height: rawH <= 12 ? 0 : Math.max(300, rawH),
      };
    };

    const flush = () => {
      cloudSizeRafRef.current = 0;
      const next = readSize();
      const prev = appliedCloudSizeRef.current;
      const isFirst = prev.width === 0 && prev.height === 0;
      if (!isFirst && prev.width === next.width && prev.height === next.height) {
        return;
      }
      if (
        !isFirst &&
        Math.abs(prev.width - next.width) < 2 &&
        Math.abs(prev.height - next.height) < 2
      ) {
        return;
      }
      appliedCloudSizeRef.current = next;
      setCloudSize(next);
    };

    const schedule = () => {
      if (cloudSizeRafRef.current !== 0) {
        cancelAnimationFrame(cloudSizeRafRef.current);
      }
      cloudSizeRafRef.current = requestAnimationFrame(flush);
    };

    flush();
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (cloudSizeRafRef.current !== 0) {
        cancelAnimationFrame(cloudSizeRafRef.current);
        cloudSizeRafRef.current = 0;
      }
    };
  }, [isTagCloud, fillHeight, questionRevealStage]);

  useEffect(() => {
    if (!isTagCloud || !hasTagWords || questionRevealStage === "options") {
      setLayoutWords([]);
      return;
    }
    const min = Math.min(...sourceWords.map((item) => item.count));
    const max = Math.max(...sourceWords.map((item) => item.count));
    const wordCount = sourceWords.length;
    const sparseBoost = Math.max(1, Math.min(1.55, 1.55 - wordCount * 0.055));
    const fontSize = (count: number, text: string) => {
      const tLinear = max === min ? 1 : (count - min) / (max - min);
      const t = Math.pow(Math.max(0, Math.min(1, tLinear)), 0.72);
      const base = max === min ? 44 : 16 + t * 30;
      const lengthPenalty = Math.max(0.68, 1 - Math.max(0, text.length - 10) * 0.018);
      return Math.round(base * sparseBoost * lengthPenalty);
    };

    const layoutW = Math.max(320, cloudSize.width - 40);
    const layoutH = Math.max(260, cloudSize.height - 40);
    const layout = cloud<ProjectorLayoutWord>()
      .size([layoutW, layoutH])
      .words(
        sourceWords.map((word) => ({
          text: word.text.toLocaleUpperCase("ru-RU"),
          count: word.count,
          size: fontSize(word.count, word.text),
          x: 0,
          y: 0,
          rotate: 0,
        })),
      )
      .padding((d) => {
        const w = d as ProjectorLayoutWord;
        return cloudTagPadding + Math.min(28, Math.round((w.size ?? 16) * 0.14));
      })
      .rotate(() => 0)
      .font(cloudFontFamily)
      .fontWeight("700")
      .fontSize((word) => word.size)
      .spiral(cloudSpiral)
      .on("end", (words: ProjectorLayoutWord[]) => {
        setLayoutWords(
          words.map((w) => ({
            ...w,
            x: Math.round(w.x ?? 0),
            y: Math.round(w.y ?? 0),
          })),
        );
      });

    layout.start();
    return () => {
      layout.stop();
    };
  }, [
    cloudSize.height,
    cloudSize.width,
    cloudFontFamily,
    cloudSpiral,
    cloudTagPadding,
    hasTagWords,
    isTagCloud,
    questionRevealStage,
    sourceWords,
  ]);

  const voteRows = useMemo(() => {
    if (question.type === "tag_cloud" || question.optionStats.length === 0) return [];
    const total = question.optionStats.reduce((sum, item) => sum + item.count, 0);
    return question.optionStats.map((o) => {
      const percent = total > 0 ? (o.count / total) * 100 : 0;
      const barDisplayPercent = percent > 0 ? percent : MIN_BAR_DISPLAY_PERCENT;
      const percentLabel = showVoteCount
        ? `${percent.toFixed(1)}% (${o.count})`
        : `${percent.toFixed(1)}%`;
      const optionLabelSx = buildOptionLabelSx(voteOptionTextColor);
      const statSx = buildStatSx(voteOptionTextColor);
      const outlineColor = !showCorrectOption
        ? DEFAULT_OUTLINE_COLOR
        : o.isCorrect
          ? CORRECT_OPTION_COLOR
          : voteProgressBarColor;
      const barColor =
        o.isCorrect && showCorrectOption ? CORRECT_OPTION_COLOR : voteProgressBarColor;
      const barSx = {
        height: 24,
        borderRadius: 99,
        overflow: "hidden",
        bgcolor: voteProgressTrackColor,
        transition: "outline-color 320ms ease, box-shadow 320ms ease, background-color 320ms ease",
        outline: `2px solid ${outlineColor}`,
        outlineOffset: "1px",
        ...(o.isCorrect && showCorrectOption
          ? {
              boxShadow: `0 0 0 1px ${CORRECT_OPTION_COLOR}52`,
            }
          : {}),
        "& .MuiLinearProgress-bar": {
          borderRadius: 99,
          bgcolor: barColor,
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), background-color 320ms ease",
        },
      };
      return {
        optionId: o.optionId,
        isCorrect: o.isCorrect,
        text: o.text,
        percent,
        barDisplayPercent,
        percentLabel,
        optionLabelSx,
        statSx,
        barSx,
      };
    });
  }, [
    question.type,
    question.optionStats,
    showVoteCount,
    showCorrectOption,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
  ]);
  const isRegularVoteQuestion = question.type !== "tag_cloud";
  const isOptionsRevealStage = isRegularVoteQuestion && questionRevealStage === "options";

  const rankingBlock = useMemo(() => {
    const baseStyle = () => ({
      optionLabelSx: buildOptionLabelSx(voteOptionTextColor),
      statSx: buildStatSx(voteOptionTextColor),
      barSx: {
        height: 24,
        borderRadius: 99,
        overflow: "hidden",
        bgcolor: voteProgressTrackColor,
        "& .MuiLinearProgress-bar": {
          borderRadius: 99,
          bgcolor: voteProgressBarColor,
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    });

    if (question.type !== "ranking" || question.optionStats.length === 0) {
      return { rows: [], statColumnTitle: null as string | null };
    }
    const requested = question.rankingProjectorMetric ?? "avg_rank";
    const hasTierStats = question.optionStats.some(
      (o) => typeof o.avgScore === "number" || typeof o.totalScore === "number",
    );
    const mode = requested !== "avg_rank" && !hasTierStats ? "avg_rank" : requested;

    if (mode === "avg_rank") {
      const withRank = question.optionStats;
      if (withRank.length === 0) return { rows: [], statColumnTitle: null };
      const avgs = withRank
        .map((o) => o.avgRank)
        .filter((v): v is number => typeof v === "number" && v > 0);
      const minR = avgs.length > 0 ? Math.min(...avgs) : 0;
      const maxR = avgs.length > 0 ? Math.max(...avgs) : 0;
      const rows = [...withRank]
        .sort((a, b) => (a.avgRank ?? 0) - (b.avgRank ?? 0))
        .map((o) => {
          const rank = typeof o.avgRank === "number" && o.avgRank > 0 ? o.avgRank : null;
          const spread = maxR > minR ? maxR - minR : 1;
          const barPercent = rank != null && maxR > minR ? ((maxR - rank) / spread) * 100 : 0;
          const barDisplayPercent = barPercent > 0 ? barPercent : MIN_BAR_DISPLAY_PERCENT;
          const st = baseStyle();
          return {
            optionId: o.optionId,
            isCorrect: false,
            text: o.text,
            percent: barPercent,
            barDisplayPercent,
            statValue: rank != null ? rank.toFixed(2) : "—",
            ...st,
          };
        });
      return { rows, statColumnTitle: "Ср. место" };
    }

    const key: "avgScore" | "totalScore" = mode === "avg_score" ? "avgScore" : "totalScore";
    const filtered = question.optionStats;
    if (filtered.length === 0) return { rows: [], statColumnTitle: null };
    const vals = filtered.map((o) => o[key]).filter((v): v is number => typeof v === "number");
    const maxForBar = vals.length > 0 ? Math.max(...vals, 0) : 0;
    const denom = Math.max(maxForBar, 1e-9);

    const rows = [...filtered]
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .map((o) => {
        const v = typeof o[key] === "number" ? (o[key] as number) : null;
        const barPercent = v != null ? (Math.max(0, v) / denom) * 100 : 0;
        const barDisplayPercent =
          barPercent > 0 ? Math.max(barPercent, MIN_BAR_DISPLAY_PERCENT) : MIN_BAR_DISPLAY_PERCENT;
        const st = baseStyle();
        const statValue =
          v == null ? "—" : mode === "avg_score" ? v.toFixed(2) : String(Math.round(v));
        return {
          optionId: o.optionId,
          isCorrect: false,
          text: o.text,
          percent: barPercent,
          barDisplayPercent,
          statValue,
          ...st,
        };
      });

    const statColumnTitle = mode === "avg_score" ? "Ср. балл" : "Баллы";
    return { rows, statColumnTitle };
  }, [
    question.type,
    question.optionStats,
    question.rankingProjectorMetric,
    voteOptionTextColor,
    voteProgressBarColor,
    voteProgressTrackColor,
  ]);

  if (!hasData) {
    return null;
  }

  if (isTagCloud) {
    const safeDensity = Math.max(0, Math.min(100, cloudDensity));
    const spreadFactor = 1.3 - (safeDensity / 100) * 0.55;
    const tagCloudOptionsOnly = questionRevealStage === "options";
    const paperFillHeight = fillHeight && !tagCloudOptionsOnly;

    return (
      <Paper
        sx={{
          p: 0,
          border: 0,
          boxShadow: "none",
          bgcolor: "transparent",
          background: "transparent",
          backgroundImage: "none",
          "--Paper-overlay": "none",
          width: "100%",
          height: paperFillHeight ? "100%" : fillHeight ? "auto" : 440,
          minHeight: paperFillHeight ? 0 : fillHeight ? 0 : 300,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {cloudHeader ? (
          <Box
            sx={{
              flexShrink: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {cloudHeader}
          </Box>
        ) : null}
        <Box
          ref={cloudContainerRef}
          sx={{
            position: "relative",
            flex: tagCloudOptionsOnly ? "0 0 0px" : 1,
            minHeight: tagCloudOptionsOnly ? 0 : 0,
            height: tagCloudOptionsOnly ? 0 : undefined,
            width: "100%",
            overflow: "hidden",
            px: 1,
          }}
        >
          {transitions((style: any, item: ProjectorLayoutWord) => (
            <animated.span
              key={item.text}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                opacity: style.opacity,
                fontSize: style.size.to((v: number) => `${v}px`),
                fontWeight: 700,
                fontFamily: cloudFontFamily,
                lineHeight: 1.1,
                color: referenceComparableSet?.has(normalizeTagComparable(item.text))
                  ? cloudCorrectTagColor
                  : item.count === maxTagCount
                    ? cloudTopTagColor
                    : colorByWord(item.text, cloudTagColors),
                whiteSpace: "nowrap",
                textAlign: "center",
                userSelect: "none",
                pointerEvents: "none",
                transform: to([style.x, style.y, style.scale], (x, y, s) => {
                  const spreadX = x * spreadFactor;
                  const spreadY = y * spreadFactor;
                  return `translate(-50%, -50%) translate(${spreadX}px, ${spreadY}px) scale(${s})`;
                }),
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
    gridTemplateColumns: "fit-content(50ch) minmax(0, 1fr) auto",
    columnGap: 3.5,
    rowGap: 1.5,
    alignItems: "center",
    bgcolor: "transparent",
  } as const;

  const barRows = question.type === "ranking" ? rankingBlock.rows : voteRows;
  const optionsRows = question.type === "ranking" ? rankingBlock.rows : voteRows;
  const rankingStatHeader = question.type === "ranking" ? rankingBlock.statColumnTitle : null;
  const answersCount = barRows.length;
  const longestAnswerLength = barRows.reduce((max, row) => Math.max(max, row.text.length), 0);
  const answersCountPenalty = answersCount > 6 ? Math.min(0.36, (answersCount - 6) * 0.06) : 0;
  const answerLengthPenalty =
    longestAnswerLength > 24 ? Math.min(0.32, (longestAnswerLength - 24) * 0.008) : 0;
  const answersPenaltyTotal = answersCountPenalty + answerLengthPenalty;
  const resultsPenalty = answersPenaltyTotal * 0.55;
  const resultsAnswerDesktopRem = Math.max(1.12, 1.52 - resultsPenalty);
  const resultsAnswerMobileRem = Math.max(1.02, resultsAnswerDesktopRem - 0.1);
  const optionsAnswerDesktopRem = Math.max(1.22, 1.95 - answersPenaltyTotal * 0.9);
  const optionsAnswerMobileRem = Math.max(1.08, optionsAnswerDesktopRem - 0.3);

  const statCell = (row: (typeof voteRows)[number] | (typeof rankingBlock.rows)[number]) =>
    "statValue" in row ? row.statValue : row.percentLabel;
  const stageKey = isOptionsRevealStage ? "options" : "results";

  return (
    <Box
      sx={{
        p: 0,
        width: "100%",
        bgcolor: "transparent",
      }}
    >
      <Fade
        key={stageKey}
        in
        timeout={{ enter: 760, exit: 620 }}
        easing={{
          enter: "cubic-bezier(0.22, 1, 0.36, 1)",
          exit: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box sx={{ width: "100%" }}>
          {isOptionsRevealStage ? (
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: { xs: 1.25, sm: 1.5, md: 2 },
                alignItems: "stretch",
              }}
            >
              {optionsRows.map((row) => (
                <Box
                  key={row.optionId}
                  sx={{
                    ...(optionsRows.length % 2 === 1 &&
                    optionsRows[optionsRows.length - 1]?.optionId === row.optionId
                      ? { gridColumn: { xs: "auto", sm: "1 / -1" } }
                      : {}),
                    minHeight: { xs: 92, md: 112 },
                    borderRadius: 2,
                    px: { xs: 2, md: 2.5 },
                    py: { xs: 1.25, md: 1.6 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    border: "2px solid",
                    borderColor: "rgba(255,255,255,0.4)",
                    bgcolor: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      ...row.optionLabelSx,
                      lineHeight: 1.2,
                      fontSize: {
                        xs: `${optionsAnswerMobileRem}rem`,
                        md: `${optionsAnswerDesktopRem}rem`,
                      },
                    }}
                  >
                    {row.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <>
              <Stack
                spacing={2}
                sx={{ width: "100%", display: { xs: "flex", md: "none" }, bgcolor: "transparent" }}
              >
                {rankingStatHeader != null && (
                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    alignItems="center"
                    sx={{ width: "100%" }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {rankingStatHeader}
                    </Typography>
                  </Stack>
                )}
                {barRows.map((row) => (
                  <Box
                    key={row.optionId}
                    sx={{
                      py: 0.5,
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      sx={{ mb: 0.75, gap: 1 }}
                    >
                      <Box
                        sx={{
                          pr: 3,
                          width: "fit-content",
                          maxWidth: "44ch",
                          minWidth: 0,
                          flexShrink: 1,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                          sx={{ minWidth: 0 }}
                        >
                          <Box
                            sx={{
                              width: row.isCorrect && showCorrectOption ? 22 : 0,
                              opacity: row.isCorrect && showCorrectOption ? 1 : 0,
                              transform:
                                row.isCorrect && showCorrectOption ? "scale(1)" : "scale(0.72)",
                              transformOrigin: "center",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition:
                                "width 260ms ease, opacity 260ms ease, transform 260ms ease",
                            }}
                          >
                            <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 22 }} />
                          </Box>
                          <Typography
                            variant="h6"
                            sx={{
                              ...row.optionLabelSx,
                              minWidth: 0,
                              overflowWrap: "anywhere",
                              fontSize: {
                                xs: `${resultsAnswerMobileRem}rem`,
                                md: `${resultsAnswerDesktopRem}rem`,
                              },
                            }}
                          >
                            {row.text}
                          </Typography>
                        </Stack>
                      </Box>
                      <Typography variant="h6" sx={{ ...row.statSx, flexShrink: 0 }}>
                        {statCell(row)}
                      </Typography>
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

              <Box sx={gridColumnsSx}>
                {rankingStatHeader != null && (
                  <Fragment key="ranking-stat-header">
                    <Box />
                    <Box />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        pl: 1,
                        alignSelf: "end",
                        pb: 0.25,
                      }}
                    >
                      {rankingStatHeader}
                    </Typography>
                  </Fragment>
                )}
                {barRows.map((row) => (
                  <Fragment key={row.optionId}>
                    <Box
                      sx={{
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            width: row.isCorrect && showCorrectOption ? 22 : 0,
                            opacity: row.isCorrect && showCorrectOption ? 1 : 0,
                            transform:
                              row.isCorrect && showCorrectOption ? "scale(1)" : "scale(0.72)",
                            transformOrigin: "center",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition:
                              "width 260ms ease, opacity 260ms ease, transform 260ms ease",
                          }}
                        >
                          <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 22 }} />
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            ...row.optionLabelSx,
                            overflowWrap: "anywhere",
                            fontSize: {
                              xs: `${resultsAnswerMobileRem}rem`,
                              md: `${resultsAnswerDesktopRem}rem`,
                            },
                          }}
                        >
                          {row.text}
                        </Typography>
                      </Stack>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={row.barDisplayPercent}
                      aria-valuenow={Math.round(row.percent)}
                      sx={{
                        ...row.barSx,
                        width: "100%",
                        minWidth: 0,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ ...row.statSx, textAlign: "right", whiteSpace: "nowrap", pl: 1 }}
                    >
                      {statCell(row)}
                    </Typography>
                  </Fragment>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Fade>
    </Box>
  );
}
