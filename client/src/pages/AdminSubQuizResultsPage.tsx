import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
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
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DownloadIcon from "@mui/icons-material/Download";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { normalizePublicViewState, type PublicViewMode, type PublicViewPayload } from "@meyouquize/shared";
import { leaderboardPlaceByScore, type LeaderboardItem } from "../admin/adminEventTypes";
import { socket } from "../socket";

type SubQuizResultsPayload = {
  subQuizId: string;
  title: string;
  quizId: string;
  questions: Array<{
    questionId: string;
    text: string;
    order: number;
    points: number;
    scoringMode: "poll" | "quiz";
    type: "single" | "multi" | "tag_cloud";
    isActive: boolean;
  }>;
  rows: Array<{
    participantId: string;
    nickname: string;
    scoresByQuestionId: Record<string, number | null>;
    totalScore: number;
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

export function AdminSubQuizResultsPage() {
  const { eventName = "", subQuizId = "" } = useParams();
  const [isAuth, setIsAuth] = useState(false);
  const [payload, setPayload] = useState<SubQuizResultsPayload | null>(null);
  const [error, setError] = useState("");
  const [publicViewMode, setPublicViewMode] = useState<PublicViewMode>("title");

  async function checkSession() {
    const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
    setIsAuth(response.ok);
    return response.ok;
  }

  useEffect(() => {
    document.title = "Результаты квиза — админ";
    void checkSession();
  }, []);

  const reloadPayload = useCallback(
    async (signal?: AbortSignal) => {
      if (!eventName || !subQuizId) return;
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/sub-quizzes/${encodeURIComponent(subQuizId)}/results`,
          { credentials: "include", signal },
        );
        if (!response.ok) {
          setError(response.status === 404 ? "Квиз не найден." : "Ошибка загрузки");
          setPayload(null);
          return;
        }
        const data = (await response.json()) as SubQuizResultsPayload;
        setPayload(data);
        setError("");
        document.title = `${data.title || "Квиз"} — результаты`;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError("Ошибка сети");
        setPayload(null);
      }
    },
    [eventName, subQuizId],
  );

  useEffect(() => {
    if (!isAuth || !eventName || !subQuizId) return;
    const controller = new AbortController();
    void reloadPayload(controller.signal);
    return () => controller.abort();
  }, [isAuth, eventName, subQuizId, reloadPayload]);

  useEffect(() => {
    if (!isAuth) return;
    if (!socket.connected) socket.connect();
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth || !eventName) return;
    const onPublicView = (p: PublicViewPayload) => {
      setPublicViewMode(normalizePublicViewState(p).mode);
    };
    socket.on("results:public:view", onPublicView);
    socket.emit("results:subscribe", { slug: eventName });
    return () => {
      socket.off("results:public:view", onPublicView);
    };
  }, [isAuth, eventName]);

  const scheduleReloadPayload = useCallback(() => {
    window.setTimeout(() => {
      void reloadPayload();
    }, 420);
  }, [reloadPayload]);

  const activeQuestionIndex = useMemo(
    () => (payload ? payload.questions.findIndex((q) => q.isActive) : -1),
    [payload],
  );

  const handleQuestionStep = useCallback(
    (direction: -1 | 1) => {
      if (!payload?.quizId || payload.questions.length === 0) return;
      const n = payload.questions.length;
      const cur = activeQuestionIndex;
      if (direction === -1) {
        if (cur <= 0) return;
        const prev = payload.questions[cur - 1];
        socket.emit("question:toggle", {
          quizId: payload.quizId,
          questionId: prev.questionId,
          enabled: true,
        });
        scheduleReloadPayload();
        return;
      }
      if (cur < 0) {
        const first = payload.questions[0];
        socket.emit("question:toggle", {
          quizId: payload.quizId,
          questionId: first.questionId,
          enabled: true,
        });
        scheduleReloadPayload();
        return;
      }
      if (cur >= n - 1) return;
      const next = payload.questions[cur + 1];
      socket.emit("question:toggle", {
        quizId: payload.quizId,
        questionId: next.questionId,
        enabled: true,
      });
      scheduleReloadPayload();
    },
    [activeQuestionIndex, payload, scheduleReloadPayload],
  );

  const toggleResultsOnProjector = useCallback(() => {
    if (!payload?.quizId) return;
    const next: PublicViewMode = publicViewMode === "leaderboard" ? "title" : "leaderboard";
    socket.emit("admin:results:view:set", {
      quizId: payload.quizId,
      mode: next,
    });
  }, [payload, publicViewMode]);

  const completeSubQuizForPlayers = useCallback(() => {
    if (!payload?.quizId || !payload.subQuizId) return;
    socket.emit("sub-quiz:close", { quizId: payload.quizId, subQuizId: payload.subQuizId });
    scheduleReloadPayload();
  }, [payload?.quizId, payload?.subQuizId, scheduleReloadPayload]);

  const placeMap = useMemo(() => {
    if (!payload?.rows.length) return new Map<string, number>();
    const asLeaderboard: LeaderboardItem[] = payload.rows.map((r) => ({
      participantId: r.participantId,
      nickname: r.nickname,
      score: r.totalScore,
    }));
    return leaderboardPlaceByScore(asLeaderboard);
  }, [payload]);

  const exportCsv = useCallback(() => {
    if (!payload) return;
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll("\"", "\"\"")}"`;
    const qHeaders = payload.questions.map((q, i) => {
      const short = `В${i + 1}: ${q.text.replace(/\s+/g, " ").slice(0, 80)}${q.text.length > 80 ? "…" : ""} (${q.points} б., ${q.scoringMode === "poll" ? "опрос" : "квиз"})`;
      return short;
    });
    const header = ["Место", "Участник", ...qHeaders, "Итого"];
    const lines = payload.rows.map((row) => {
      const place = placeMap.get(row.participantId) ?? "";
      const cells = payload.questions.map((q) =>
        scoreCellLabel(row.scoresByQuestionId[q.questionId] ?? null, q.scoringMode),
      );
      return [place, row.nickname, ...cells, row.totalScore].map(escapeCsv).join(",");
    });
    const csvContent = [header.map(escapeCsv).join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = payload.title.replace(/\s+/g, "_").slice(0, 48);
    link.download = `quiz-results-${eventName || "event"}-${slug || "quiz"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [payload, placeMap, eventName]);

  if (!isAuth) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom>
          Админ
        </Typography>
        <AdminLoginForm
          onSuccess={() => {
            setIsAuth(true);
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} flexWrap="wrap">
          <Button
            component={RouterLink}
            to={`/admin/${eventName}`}
            startIcon={<ArrowBackIcon />}
            variant="text"
            sx={{ alignSelf: "flex-start" }}
          >
            К комнате
          </Button>
          <Tooltip title="Скачать CSV">
            <span>
              <IconButton
                onClick={exportCsv}
                disabled={!payload || payload.rows.length === 0}
                aria-label="Скачать CSV"
                color="primary"
              >
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {!!error && <Alert severity="warning">{error}</Alert>}
        {payload && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {payload.title.trim() || "Квиз"}
              </Typography>
              {payload.questions.length === 0 ? (
                <Typography color="text.secondary">В этом квизе пока нет вопросов.</Typography>
              ) : (
                <>
                  <Stack spacing={1.5} sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {activeQuestionIndex >= 0 ? (
                        <>
                          Сейчас открыт для ответов: <strong>В{activeQuestionIndex + 1}</strong>
                          {" — "}
                          {(payload.questions[activeQuestionIndex]?.text ?? "").trim().slice(0, 120)}
                          {(payload.questions[activeQuestionIndex]?.text.length ?? 0) > 120 ? "…" : ""}
                        </>
                      ) : (
                        "В этом квизе сейчас нет открытого вопроса (или на экране активен другой блок комнаты)."
                      )}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                      <Button
                        variant="outlined"
                        startIcon={<ChevronLeftIcon />}
                        onClick={() => handleQuestionStep(-1)}
                        disabled={!payload.quizId || activeQuestionIndex <= 0}
                        sx={{ textTransform: "none" }}
                      >
                        Назад
                      </Button>
                      <Button
                        variant="outlined"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => handleQuestionStep(1)}
                        disabled={
                          !payload.quizId ||
                          payload.questions.length === 0 ||
                          (activeQuestionIndex >= 0 && activeQuestionIndex >= payload.questions.length - 1)
                        }
                        sx={{ textTransform: "none" }}
                      >
                        Вперёд
                      </Button>
                      <Tooltip title="Снять все вопросы этого квиза с экрана и показать участникам экран «Квиз завершён»">
                        <span>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<DoneAllIcon />}
                            onClick={completeSubQuizForPlayers}
                            disabled={!payload.quizId || !payload.subQuizId || payload.questions.length === 0}
                            sx={{ textTransform: "none" }}
                          >
                            Завершить
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          publicViewMode === "leaderboard"
                            ? "Скрыть таблицу лидеров на проекторе"
                            : "Показать таблицу лидеров на проекторе"
                        }
                      >
                        <Button
                          variant={publicViewMode === "leaderboard" ? "contained" : "outlined"}
                          color={publicViewMode === "leaderboard" ? "secondary" : "primary"}
                          startIcon={<LeaderboardIcon />}
                          onClick={toggleResultsOnProjector}
                          disabled={!payload.quizId}
                          sx={{ textTransform: "none" }}
                        >
                          {publicViewMode === "leaderboard" ? "Скрыть таблицу" : "Результаты"}
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  {payload.rows.length === 0 ? (
                    <Typography color="text.secondary">
                      {"Пока нет участников с ответами в этом квизе."}
                    </Typography>
                  ) : (
                    <TableContainer
                      sx={{
                        maxHeight: "min(70vh, 640px)",
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
                                minWidth: 160,
                                bgcolor: "background.paper",
                                boxShadow: (t) =>
                                  `4px 0 8px ${t.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`,
                              }}
                            >
                              Участник
                            </TableCell>
                            {payload.questions.map((q, i) => (
                              <TableCell
                                key={q.questionId}
                                align="center"
                                sx={
                                  q.isActive
                                    ? {
                                        bgcolor: (theme) =>
                                          alpha(
                                            theme.palette.primary.main,
                                            theme.palette.mode === "dark" ? 0.22 : 0.12,
                                          ),
                                      }
                                    : undefined
                                }
                              >
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
                                  <Typography variant="caption" component="span" sx={{ cursor: "help", fontWeight: 600 }}>
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
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payload.rows.map((row) => {
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
                                {payload.questions.map((q) => {
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
                                        ...(q.isActive
                                          ? {
                                              bgcolor: (theme) =>
                                                alpha(
                                                  theme.palette.primary.main,
                                                  theme.palette.mode === "dark" ? 0.14 : 0.08,
                                                ),
                                            }
                                          : {}),
                                      }}
                                    >
                                      {label}
                                    </TableCell>
                                  );
                                })}
                                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                  {row.totalScore}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
