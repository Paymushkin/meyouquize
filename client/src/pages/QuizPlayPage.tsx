import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { API_BASE } from "../config";
import { useQuizPlayCompletion } from "../hooks/useQuizPlayCompletion";
import { useQuizPlayScrollLock } from "../hooks/useQuizPlayScrollLock";
import { useQuizPlaySocket } from "../hooks/useQuizPlaySocket";
import { socket } from "../socket";
import { getNickname, getOrCreateDeviceId, randomNickname, setNickname } from "../storage";
import type { QuizState } from "./quiz-play/types";

function getRoomJoinKey(slug: string) {
  return `mq_joined_${slug}`;
}

function getRoomNickKey(slug: string) {
  return `mq_nickname_${slug}`;
}

function emitJoinWithLog(slug: string, reason: "manual" | "restore", nick: string) {
  const payload = {
    slug,
    nickname: nick,
    deviceId: getOrCreateDeviceId(),
  };
  console.info("[quiz-play] join attempt", {
    reason,
    connected: socket.connected,
    socketId: socket.id,
    payload,
  });
  if (socket.connected) {
    socket.emit("quiz:join", payload);
    return;
  }
  socket.connect();
  socket.once("connect", () => {
    console.info("[quiz-play] socket connected, retry join", { socketId: socket.id, reason });
    socket.emit("quiz:join", payload);
  });
}

export function QuizPlayPage() {
  const { slug = "" } = useParams();
  const [quizTitle, setQuizTitle] = useState("");
  const [nickname, setNick] = useState(() => {
    const roomNickname = slug ? localStorage.getItem(getRoomNickKey(slug)) : "";
    return roomNickname || getNickname() || randomNickname();
  });
  const [joined, setJoined] = useState(false);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tagAnswers, setTagAnswers] = useState<string[]>([""]);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string[]>>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const activeQuestionIdRef = useRef<string | null>(null);
  const activeQuestionTypeRef = useRef<"single" | "multi" | "tag_cloud" | null>(null);
  const selectedRef = useRef<string[]>([]);
  const tagAnswersRef = useRef<string[]>([""]);
  /** Последний известный активный вопрос сабквиза (чтобы при снятии вопроса с экрана понять, что это был последний). */
  const lastSubQuizProgressRef = useRef<{ questionId: string; index: number; total: number } | null>(null);

  const {
    subQuizCompleteOpen,
    finalCompletionDismissed,
    setFinalCompletionDismissed,
    showSubQuizCompleteCard,
    showFinishedCompletionCard,
    showIdleWaiting,
    hasActiveQuestion,
  } = useQuizPlayCompletion({
    slug,
    joined,
    quiz,
    submittedQuestionIds,
    lastSubQuizProgressRef,
  });

  useEffect(() => {
    activeQuestionIdRef.current = quiz?.activeQuestion?.id ?? null;
    activeQuestionTypeRef.current = quiz?.activeQuestion?.type ?? null;
  }, [quiz]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    tagAnswersRef.current = tagAnswers;
  }, [tagAnswers]);

  useEffect(() => {
    if (!slug) return;
    const roomNickname = localStorage.getItem(getRoomNickKey(slug));
    if (roomNickname) setNick(roomNickname);
  }, [slug]);

  useQuizPlayScrollLock({
    joined,
    quiz,
    subQuizCompleteOpen,
    finalCompletionDismissed,
    lastSubQuizProgressRef,
  });

  useQuizPlaySocket({
    activeQuestionIdRef,
    activeQuestionTypeRef,
    selectedRef,
    tagAnswersRef,
    setQuiz,
    setSelected,
    setTagAnswers,
    setSubmittedAnswers,
    setSubmittedQuestionIds,
    setError,
    setJoined,
  });

  useEffect(() => {
    document.title = quiz?.title?.trim() || "Квиз";
  }, [quiz?.title]);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/quiz/by-slug/${slug}/meta`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { title?: string };
        if (typeof payload.title === "string") {
          setQuizTitle(payload.title);
        }
      } catch {
        // ignore network errors, socket state can still provide title later
      }
    })();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug || !nickname.trim()) return;
    const wasJoined = localStorage.getItem(getRoomJoinKey(slug)) === "1";
    if (!wasJoined) return;
    emitJoinWithLog(slug, "restore", nickname.trim());
  }, [slug, nickname]);

  const canSubmit = useMemo(() => {
    if (!quiz?.activeQuestion) return false;
    const alreadySubmitted = submittedQuestionIds.includes(quiz.activeQuestion.id);
    if (quiz.activeQuestion.type === "tag_cloud") {
      const filled = tagAnswers.map((value) => value.trim()).filter(Boolean);
      return filled.length > 0 && !quiz.activeQuestion.isClosed && !alreadySubmitted;
    }
    return selected.length > 0 && !quiz.activeQuestion.isClosed && !alreadySubmitted;
  }, [quiz, selected, submittedQuestionIds, tagAnswers]);

  function join() {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    emitJoinWithLog(slug, "manual", trimmed);
    localStorage.setItem(getRoomJoinKey(slug), "1");
    localStorage.setItem(getRoomNickKey(slug), trimmed);
    setNick(trimmed);
    setError("");
  }

  function toggleOption(id: string) {
    if (!quiz?.activeQuestion) return;
    if (quiz.activeQuestion.type === "single") {
      setSelected([id]);
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function submit() {
    if (!quiz?.activeQuestion || !canSubmit) return;
    if (quiz.activeQuestion.type === "tag_cloud") {
      socket.emit("answer:submit", {
        quizId: quiz.id,
        questionId: quiz.activeQuestion.id,
        tagAnswers: tagAnswers.map((value) => value.trim()).filter(Boolean),
      });
      return;
    }
    socket.emit("answer:submit", {
      quizId: quiz.id,
      questionId: quiz.activeQuestion.id,
      optionIds: selected,
    });
  }

  const answeredCurrentQuestion =
    !!quiz?.activeQuestion?.id && submittedQuestionIds.includes(quiz.activeQuestion.id);
  const displayedSelected =
    quiz?.activeQuestion?.id && submittedAnswers[quiz.activeQuestion.id]
      ? submittedAnswers[quiz.activeQuestion.id]
      : selected;
  const titleText = quiz?.title?.trim() || quizTitle.trim() || "Квиз";

  return (
    <Container
      maxWidth="md"
      sx={{
        py: 4,
        minHeight: "100vh",
        height: hasActiveQuestion ? "auto" : "100dvh",
        overflowY: hasActiveQuestion ? "auto" : "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: hasActiveQuestion ? "center" : "flex-start",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: 96, sm: 128 },
          ...(hasActiveQuestion ? { minHeight: 0, mb: 2 } : {}),
          ...(!joined ? { flex: 1 } : {}),
        }}
      >
        <Typography variant="h3" gutterBottom align="center" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
          {titleText}
        </Typography>
      </Box>
      {!joined && (
        <Card
          variant="outlined"
          sx={{ mt: "auto", mb: { xs: 3, md: 5 }, width: "100%", maxWidth: 520, mx: "auto" }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  value={nickname}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Ваш ник"
                  label="Никнейм"
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": { minHeight: 56 },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => setNick(randomNickname())}
                  sx={{
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    minHeight: 56,
                    px: 4,
                    mx: { xs: 0, sm: 1 },
                    minWidth: { sm: 180 },
                    whiteSpace: "nowrap",
                  }}
                >
                  Случайное имя
                </Button>
              </Stack>
              <Button variant="contained" onClick={join}>
                Войти
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {joined && quiz?.activeQuestion && !showSubQuizCompleteCard && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                {quiz.quizProgress && quiz.quizProgress.total > 0 ? (
                  <Chip
                    label={`Вопрос ${quiz.quizProgress.index} / ${quiz.quizProgress.total}`}
                    size="small"
                    sx={{
                      height: 24,
                      "& .MuiChip-label": { px: 1, fontSize: "0.72rem", fontWeight: 600 },
                    }}
                  />
                ) : null}
                <Chip
                  label={
                    quiz.activeQuestion.type === "single"
                      ? "Один ответ"
                      : quiz.activeQuestion.type === "multi"
                        ? "Несколько ответов"
                        : "Облако тегов"
                  }
                  size="small"
                  sx={{
                    height: 24,
                    "& .MuiChip-label": { px: 1, fontSize: "0.72rem", fontWeight: 600 },
                  }}
                />
              </Stack>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: "2rem", sm: "2.25rem" }, pb: 2 }}
              >
                {quiz.activeQuestion.text}
              </Typography>
              {quiz.activeQuestion.type !== "tag_cloud" && (
                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ pb: 4 }}>
                  {quiz.activeQuestion.options.map((option) => (
                    <Button
                      key={option.id}
                      variant={displayedSelected.includes(option.id) ? "contained" : "outlined"}
                      color={displayedSelected.includes(option.id) ? "primary" : "inherit"}
                      disabled={answeredCurrentQuestion}
                      onClick={() => toggleOption(option.id)}
                      startIcon={displayedSelected.includes(option.id) ? <CheckCircleIcon /> : undefined}
                    >
                      {option.text}
                    </Button>
                  ))}
                </Stack>
              )}
              {quiz.activeQuestion.type === "tag_cloud" && (
                <Stack spacing={1.5}>
                  {(answeredCurrentQuestion
                    ? (submittedAnswers[quiz.activeQuestion.id] ?? [])
                    : tagAnswers
                  ).map((value, index) => (
                    <Stack key={`tag-answer-${index}`} direction="row" spacing={1} alignItems="center">
                      <TextField
                        value={value}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          const limit = quiz.activeQuestion?.maxAnswers ?? 5;
                          setTagAnswers((prev) => {
                            const next = prev.map((item, i) => (i === index ? nextValue : item));
                            const isLastField = index === next.length - 1;
                            if (isLastField && nextValue.trim() && next.length < limit) {
                              next.push("");
                            }
                            return next;
                          });
                        }}
                        placeholder={`Ответ ${index + 1}`}
                        size="small"
                        disabled={answeredCurrentQuestion}
                        multiline
                        minRows={1}
                        maxRows={3}
                        sx={{ flex: 1 }}
                      />
                      {!answeredCurrentQuestion && index > 0 && (
                        <IconButton
                          aria-label="Удалить ответ"
                          color="inherit"
                          onClick={() =>
                            setTagAnswers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
                          }
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
            {!answeredCurrentQuestion && (
              <Box sx={{ pt: 1 }}>
                <Button
                  disabled={!canSubmit}
                  onClick={submit}
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ minHeight: 52, fontSize: "1.05rem", fontWeight: 700 }}
                >
                  Отправить ответ
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      {joined && showSubQuizCompleteCard && (
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 520, mx: "auto", mt: 2 }}>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ textAlign: "center", py: 1 }}>
              <EmojiEventsIcon sx={{ fontSize: 64, color: "success.main" }} aria-hidden />
              <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
                Квиз завершён
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Вы прошли все вопросы. Спасибо за участие!
              </Typography>
              <Button variant="outlined" size="large" sx={{ mt: 1, minWidth: 200 }} onClick={() => setFinalCompletionDismissed(true)}>
                Закрыть
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {joined && showFinishedCompletionCard && (
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 520, mx: "auto", mt: 2 }}>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ textAlign: "center", py: 2 }}>
              <EmojiEventsIcon sx={{ fontSize: 64, color: "success.main" }} aria-hidden />
              <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
                Квиз завершён
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Спасибо за участие!
              </Typography>
              <Button variant="outlined" size="large" sx={{ mt: 1, minWidth: 200 }} onClick={() => setFinalCompletionDismissed(true)}>
                Закрыть
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {showIdleWaiting && <Alert severity="info">Ожидаем следующий вопрос...</Alert>}
      {!!error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
    </Container>
  );
}
