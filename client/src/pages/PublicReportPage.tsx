import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { ReportModuleId } from "@meyouquize/shared";
import { API_BASE } from "../config";
import { buildBrandBackground } from "../features/branding/brandVisual";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";
import { useBrandFont } from "../hooks/useBrandFont";
import { useEventFavicon } from "../hooks/useEventFavicon";
import { leaderboardPlaceByScore, type LeaderboardItem } from "../admin/adminEventTypes";

type PublicReportPayload = {
  title: string;
  slug: string;
  generatedAt: string;
  branding: {
    brandPrimaryColor: string;
    brandAccentColor: string;
    brandSurfaceColor: string;
    brandTextColor: string;
    brandFontFamily: string;
    brandLogoUrl: string;
    brandProjectorBackgroundImageUrl: string;
    brandBodyBackgroundColor: string;
  };
  config: {
    reportTitle: string;
    reportModules: ReportModuleId[];
    reportVoteQuestionIds: string[];
    reportQuizQuestionIds: string[];
    reportQuizSubQuizIds: string[];
    reportPublished: boolean;
  };
  summary: {
    participantsCount: number;
    questionsCount: number;
    subQuizzesCount: number;
    answersCount: number;
  };
  leaderboard: Array<{ nickname: string; score: number; totalResponseMs: number }>;
  quizQuestions: Array<{
    questionId: string;
    text: string;
    subQuizId?: string | null;
    subQuizTitle?: string;
    type: "single" | "multi" | "tag_cloud" | "ranking";
    optionStats: Array<{
      text: string;
      count: number;
      isCorrect?: boolean;
      avgRank?: number;
      avgScore?: number;
      totalScore?: number;
    }>;
    tagCloud: Array<{ text: string; count: number }>;
  }>;
  voteQuestions: Array<{
    questionId: string;
    text: string;
    subQuizId?: string | null;
    subQuizTitle?: string;
    type: "single" | "multi" | "tag_cloud" | "ranking";
    optionStats: Array<{
      text: string;
      count: number;
      isCorrect?: boolean;
      avgRank?: number;
      avgScore?: number;
      totalScore?: number;
    }>;
    tagCloud: Array<{ text: string; count: number }>;
  }>;
  randomizer: {
    currentWinners: string[];
    history: Array<{ timestamp: string; winners: string[] }>;
  };
  reactions: {
    overlayText: string;
    widgets: Array<{
      id: string;
      title: string;
      reactions: string[];
      reactionStats: Array<{ reaction: string; count: number }>;
    }>;
  };
  speakerQuestions: {
    enabled: boolean;
    total: number;
    onScreen: number;
    items: Array<{
      id: string;
      speakerName: string;
      text: string;
      author: string;
      reactions: Array<{ reaction: string; count: number }>;
    }>;
  };
  subQuizParticipantTables: Array<{
    subQuizId: string;
    title: string;
    quizId: string;
    questions: Array<{
      questionId: string;
      text: string;
      order: number;
      points: number;
      scoringMode: "poll" | "quiz";
      type: "single" | "multi" | "tag_cloud" | "ranking";
      isActive: boolean;
    }>;
    rows: Array<{
      participantId: string;
      nickname: string;
      scoresByQuestionId: Record<string, number | null>;
      totalScore: number;
      totalResponseMs: number;
    }>;
  }>;
};

const STICKY_PLACE_LEFT = 0;
const STICKY_PLACE_WIDTH = 56;
const STICKY_NAME_LEFT = STICKY_PLACE_WIDTH;

function scoreCellLabel(value: number | null, scoringMode: "poll" | "quiz"): string {
  if (value === null) return "—";
  if (scoringMode === "poll") return value === 0 ? "0" : String(value);
  return String(value);
}

function formatSecondsFromMs(valueMs: number): string {
  const sec = valueMs / 1000;
  return `${sec.toFixed(1)} с`;
}

function SubQuizReportParticipantTable({
  table,
  isPdfMode,
}: {
  table: PublicReportPayload["subQuizParticipantTables"][number];
  isPdfMode: boolean;
}) {
  const placeMap = (() => {
    if (!table.rows.length) return new Map<string, number>();
    const asLeaderboard: LeaderboardItem[] = table.rows.map((r) => ({
      participantId: r.participantId,
      nickname: r.nickname,
      score: r.totalScore,
    }));
    return leaderboardPlaceByScore(asLeaderboard);
  })();

  if (table.questions.length === 0) return null;

  return (
    <TableContainer
      sx={{
        mt: 1.5,
        maxHeight: isPdfMode ? "none" : "min(70vh, 640px)",
        overflow: "auto",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              align="right"
              sx={{
                position: "sticky",
                left: STICKY_PLACE_LEFT,
                zIndex: 4,
                minWidth: STICKY_PLACE_WIDTH,
                bgcolor: "background.paper",
                boxShadow: (t) =>
                  `4px 0 8px ${t.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`,
              }}
            >
              №
            </TableCell>
            <TableCell
              sx={{
                position: "sticky",
                left: STICKY_NAME_LEFT,
                zIndex: 4,
                minWidth: 100,
                bgcolor: "background.paper",
                boxShadow: (t) =>
                  `4px 0 8px ${t.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`,
              }}
            >
              Участник
            </TableCell>
            {table.questions.map((q, i) => (
              <TableCell key={q.questionId} align="center">
                <Tooltip
                  title={
                    <span>
                      {q.text}
                      <br />
                      Макс. {q.points} б. · {q.scoringMode === "poll" ? "опрос" : "квиз"} ·{" "}
                      {q.type === "tag_cloud"
                        ? "облако"
                        : q.type === "multi"
                          ? "несколько"
                          : "один ответ"}
                    </span>
                  }
                >
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{ cursor: "help", fontWeight: 600 }}
                  >
                    В{i + 1}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({q.points})
                    </Typography>
                  </Typography>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Σ
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 44, minWidth: 44, px: 1 }}>
              <Tooltip title="Общее время ответа, секунды">
                <AccessTimeIcon fontSize="small" />
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {table.rows.map((row) => {
            const place = placeMap.get(row.participantId) ?? "—";
            return (
              <TableRow key={row.participantId} hover>
                <TableCell
                  align="right"
                  sx={{
                    position: "sticky",
                    left: STICKY_PLACE_LEFT,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    boxShadow: (t) =>
                      `4px 0 8px ${t.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`,
                  }}
                >
                  {place}
                </TableCell>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: STICKY_NAME_LEFT,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    boxShadow: (t) =>
                      `4px 0 8px ${t.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`,
                  }}
                >
                  {row.nickname}
                </TableCell>
                {table.questions.map((q) => {
                  const v = row.scoresByQuestionId[q.questionId] ?? null;
                  const label = scoreCellLabel(v, q.scoringMode);
                  const muted = v === null;
                  return (
                    <TableCell
                      key={q.questionId}
                      align="center"
                      sx={{
                        color: muted ? "text.secondary" : "text.primary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {label}
                    </TableCell>
                  );
                })}
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                >
                  {row.totalScore}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    width: 44,
                    minWidth: 44,
                    px: 1,
                  }}
                >
                  {formatSecondsFromMs(row.totalResponseMs)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function QuestionBarChart({
  rows,
}: {
  rows: Array<{ text: string; count: number; isCorrect?: boolean }>;
}) {
  const total = rows.reduce((acc, row) => acc + row.count, 0);
  return (
    <Stack spacing={0.75} sx={{ mt: 0.75 }}>
      {rows.map((row, index) => (
        <Stack key={`${row.text}-${index}`} spacing={0.25}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {row.isCorrect ? (
              <CheckCircleIcon sx={{ color: "success.main", fontSize: 16 }} />
            ) : null}
            <Typography variant="body2">{row.text}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${total > 0 ? (row.count / total) * 100 : 0}%`,
                  bgcolor: "primary.main",
                }}
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 52, textAlign: "right" }}
            >
              {total > 0 ? `${Math.round((row.count / total) * 100)}%` : "0%"} • {row.count}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export function PublicReportPage() {
  const { slug = "" } = useParams();
  const [payload, setPayload] = useState<PublicReportPayload | null>(null);
  const [error, setError] = useState("");
  const isPdfMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("pdf") === "1";
  }, []);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/quiz/by-slug/${encodeURIComponent(slug)}/public-report`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          setError("Отчет не найден или не опубликован");
          return;
        }
        const data = (await response.json()) as PublicReportPayload;
        setPayload(data);
      } catch {
        setError("Не удалось загрузить отчет");
      }
    })();
    return () => controller.abort();
  }, [slug]);

  const fontFamily = payload?.branding.brandFontFamily ?? "Jost, Arial, sans-serif";
  const logoUrl = resolveClientAssetUrl(payload?.branding.brandLogoUrl ?? "");
  const bgUrl = resolveClientAssetUrl(payload?.branding.brandProjectorBackgroundImageUrl ?? "");
  useBrandFont(fontFamily);
  useEventFavicon(logoUrl);

  const backgroundSx = useMemo(() => buildBrandBackground({ backgroundImageUrl: bgUrl }), [bgUrl]);

  useEffect(() => {
    if (!isPdfMode || !payload) return;
    const style = document.createElement("style");
    style.setAttribute("data-report-pdf-print", "true");
    style.textContent = `
      @page { size: A4; margin: 0; }
      html, body, #root { margin: 0 !important; padding: 0 !important; }
      body {
        background: ${payload.branding.brandBodyBackgroundColor || "#0f1d2a"} !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-card, .report-group, .report-question, .report-row {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [isPdfMode, payload]);

  if (!payload && !error) {
    return (
      <Container
        maxWidth={false}
        disableGutters
        sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="warning">{error}</Alert>
      </Container>
    );
  }

  const modules = payload!.config.reportModules;
  const hasModule = (id: ReportModuleId) => modules.includes(id);
  const tableBySubId = new Map(
    (payload!.subQuizParticipantTables ?? []).map((t) => [t.subQuizId, t] as const),
  );
  const tableOrder = (payload!.subQuizParticipantTables ?? []).map((t) => t.subQuizId);
  const bySubQuizId = new Map<
    string,
    { subQuizId: string; title: string; questions: PublicReportPayload["quizQuestions"] }
  >();
  for (const question of payload!.quizQuestions) {
    if (question.type === "tag_cloud") continue;
    const sid = question.subQuizId;
    if (!sid) continue;
    const prev = bySubQuizId.get(sid);
    if (!prev) {
      bySubQuizId.set(sid, {
        subQuizId: sid,
        title: question.subQuizTitle?.trim() || "Без названия квиза",
        questions: [question],
      });
    } else {
      prev.questions.push(question);
    }
  }
  const subQuizGroups: Array<{
    subQuizId: string;
    title: string;
    questions: PublicReportPayload["quizQuestions"];
    participantTable: PublicReportPayload["subQuizParticipantTables"][number] | undefined;
  }> = [];
  const seenGroup = new Set<string>();
  for (const sid of tableOrder) {
    const g = bySubQuizId.get(sid);
    if (!g || seenGroup.has(sid)) continue;
    seenGroup.add(sid);
    subQuizGroups.push({ ...g, participantTable: tableBySubId.get(sid) });
  }
  for (const g of bySubQuizId.values()) {
    if (seenGroup.has(g.subQuizId)) continue;
    seenGroup.add(g.subQuizId);
    subQuizGroups.push({ ...g, participantTable: tableBySubId.get(g.subQuizId) });
  }
  const randomizerRunsToShow =
    payload!.randomizer.history.length > 0
      ? payload!.randomizer.history.map((h) => ({ timestamp: h.timestamp, winners: h.winners }))
      : payload!.randomizer.currentWinners.length > 0
        ? [{ timestamp: "", winners: payload!.randomizer.currentWinners }]
        : [];
  const voteQuestionsCount = payload!.voteQuestions.filter(
    (question) => question.type !== "tag_cloud",
  ).length;

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        ...backgroundSx,
        minHeight: "100dvh",
        py: isPdfMode ? 0 : 4,
        px: isPdfMode ? 0 : { xs: 2, md: 4 },
        backgroundColor: payload!.branding.brandBodyBackgroundColor,
        fontFamily,
      }}
    >
      <Stack
        spacing={2}
        sx={{
          maxWidth: isPdfMode ? "none" : 1100,
          mx: isPdfMode ? 0 : "auto",
          p: isPdfMode ? 1.5 : 0,
        }}
      >
        {hasModule("event_header") && (
          <Card variant="outlined" className="report-card">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.5} sx={{ textAlign: "left" }}>
                  <Typography variant="h4">
                    {payload!.config.reportTitle || payload!.title}
                  </Typography>
                  <Typography variant="body2">Событие: {payload!.title}</Typography>
                  <Typography variant="body2">
                    Сформирован: {new Date(payload!.generatedAt).toLocaleString("ru-RU")}
                  </Typography>
                </Stack>
                {logoUrl ? (
                  <Box component="img" src={logoUrl} alt="Логотип" sx={{ maxHeight: 72 }} />
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        )}

        {hasModule("participation_summary") &&
          payload!.summary.participantsCount +
            payload!.summary.answersCount +
            payload!.summary.questionsCount >
            0 && (
            <Card variant="outlined" className="report-card">
              <CardContent>
                <Typography variant="h6">Итоги участия</Typography>
                <Box
                  sx={{
                    mt: 1.25,
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, minmax(0, 1fr))",
                      md: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {[
                    { label: "Участников", value: payload!.summary.participantsCount },
                    { label: "Голосований", value: voteQuestionsCount },
                    { label: "Вопросов спикерам", value: payload!.speakerQuestions.total },
                    { label: "Квизов", value: payload!.summary.subQuizzesCount },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={900}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

        {hasModule("quiz_results") && payload!.quizQuestions.length > 0 && (
          <Card variant="outlined" className="report-card">
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Результаты квизов</Typography>
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    px: 1,
                    borderRadius: 999,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {
                    payload!.quizQuestions.filter((question) => question.type !== "tag_cloud")
                      .length
                  }
                </Box>
              </Stack>
              <Stack spacing={2}>
                {subQuizGroups.map((group) => (
                  <Box
                    key={group.subQuizId}
                    className="report-group"
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.5 }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      {group.title}
                    </Typography>
                    <Stack spacing={1.25}>
                      {group.questions.slice(0, 20).map((question) => (
                        <Box key={question.questionId} className="report-question">
                          <Typography fontWeight={700}>{question.text}</Typography>
                          <QuestionBarChart
                            rows={question.optionStats.slice(0, 8).map((item) => ({
                              text: item.text,
                              count: item.count,
                              isCorrect: item.isCorrect,
                            }))}
                          />
                        </Box>
                      ))}
                    </Stack>
                    {group.participantTable && group.participantTable.rows.length > 0 ? (
                      <Box className="report-row" sx={{ mt: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                          Таблица результатов
                        </Typography>
                        <SubQuizReportParticipantTable
                          table={group.participantTable}
                          isPdfMode={isPdfMode}
                        />
                      </Box>
                    ) : group.participantTable && group.participantTable.rows.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Пока нет участников с ответами в этом квизе.
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {hasModule("vote_results") && payload!.voteQuestions.length > 0 && (
          <Card variant="outlined" className="report-card">
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Результаты голосований</Typography>
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    px: 1,
                    borderRadius: 999,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {
                    payload!.voteQuestions.filter((question) => question.type !== "tag_cloud")
                      .length
                  }
                </Box>
              </Stack>
              <Stack spacing={1.25}>
                {payload!.voteQuestions
                  .filter((question) => question.type !== "tag_cloud")
                  .slice(0, 20)
                  .map((question) => (
                    <Box
                      key={question.questionId}
                      className="report-question"
                      sx={{
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1.25,
                      }}
                    >
                      <Typography fontWeight={700}>{question.text}</Typography>
                      <QuestionBarChart
                        rows={question.optionStats.slice(0, 8).map((item) => ({
                          text: item.text,
                          count: item.count,
                          isCorrect: item.isCorrect,
                        }))}
                      />
                    </Box>
                  ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {hasModule("reactions_summary") && payload!.reactions.widgets.length > 0 && (
          <Card variant="outlined" className="report-card">
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Реакции аудитории</Typography>
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    px: 1,
                    borderRadius: 999,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {payload!.reactions.widgets.length}
                </Box>
              </Stack>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {payload!.reactions.widgets.map((widget) => (
                  <Box
                    key={widget.id}
                    className="report-row"
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      px: 1.25,
                      py: 1,
                    }}
                  >
                    <Typography fontWeight={700}>
                      {widget.title || "Виджет без названия"}
                    </Typography>
                    <Typography variant="body2">
                      Реакции:{" "}
                      {widget.reactionStats.length > 0
                        ? widget.reactionStats
                            .map((item) => `${item.reaction} (${item.count})`)
                            .join(", ")
                        : "нет"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {hasModule("randomizer_summary") &&
          (payload!.randomizer.currentWinners.length > 0 ||
            payload!.randomizer.history.length > 0) && (
            <Card variant="outlined" className="report-card">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">Итоги рандомайзера</Typography>
                  <Box
                    sx={{
                      minWidth: 32,
                      height: 32,
                      px: 1,
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {randomizerRunsToShow.length}
                  </Box>
                </Stack>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {randomizerRunsToShow.length > 0 ? (
                    randomizerRunsToShow.map((run, runIndex) => (
                      <Box
                        key={`${run.timestamp}-${runIndex}`}
                        className="report-row"
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          p: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {run.timestamp ? `Запуск ${run.timestamp}` : `Запуск #${runIndex + 1}`}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          useFlexGap
                          flexWrap="wrap"
                          sx={{ mt: 0.5 }}
                        >
                          {run.winners.map((winner, winnerIndex) => (
                            <Box
                              key={`${winner}-${winnerIndex}`}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 999,
                                px: 1.25,
                                py: 0.5,
                              }}
                            >
                              <Typography variant="body2" fontWeight={700}>
                                {winner}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Победителей пока нет
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

        {hasModule("speaker_questions_summary") && payload!.speakerQuestions.total > 0 && (
          <Card variant="outlined" className="report-card">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Вопросы спикерам</Typography>
                <Box
                  sx={{
                    minWidth: 32,
                    height: 32,
                    px: 1,
                    borderRadius: 999,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {payload!.speakerQuestions.total}
                </Box>
              </Stack>
              <TableContainer sx={{ mt: 1.25 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Кому</TableCell>
                      <TableCell>Вопрос</TableCell>
                      <TableCell>Автор</TableCell>
                      <TableCell>Реакции</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payload!.speakerQuestions.items.slice(0, 30).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.speakerName}</TableCell>
                        <TableCell>{item.text}</TableCell>
                        <TableCell>{item.author}</TableCell>
                        <TableCell>
                          {item.reactions.length > 0
                            ? item.reactions
                                .map((reaction) => `${reaction.reaction} (${reaction.count})`)
                                .join(", ")
                            : "нет"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {!isPdfMode && (
          <Button
            variant="outlined"
            href={`${API_BASE}/api/quiz/by-slug/${encodeURIComponent(slug)}/public-report.pdf`}
            target="_blank"
            rel="noreferrer"
            sx={{ alignSelf: "flex-start" }}
          >
            Скачать PDF
          </Button>
        )}
      </Stack>
    </Container>
  );
}
