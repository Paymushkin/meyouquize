import { useEffect, useRef, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { ruBallLabel } from "@meyouquize/shared";
import { socket } from "../../socket";
import type {
  PlayerSubQuizReportQuestionRow,
  PlayerSubQuizReportPayload,
} from "../../pages/quiz-play/types";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_PAPER_SX,
  PLAYER_DIALOG_SECONDARY_TEXT,
  PLAYER_DIALOG_TITLE_SX,
} from "./playerDialogStyles";

type Props = {
  open: boolean;
  quizId: string;
  subQuizId: string;
  brandPrimaryColor: string;
  onClose: () => void;
};

function normalizeAnswerLine(s: string): string {
  return s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function isQuestionAnswered(q: PlayerSubQuizReportQuestionRow): boolean {
  const answer = q.userAnswerText.trim();
  return answer.length > 0 && answer !== "Нет ответа";
}

function isQuestionFullyCorrect(q: PlayerSubQuizReportQuestionRow): boolean {
  if (q.userAnswerText.trim() === "" || q.userAnswerText === "Нет ответа") {
    return false;
  }
  if (q.scoringMode === "quiz" && q.points > 0 && typeof q.scoreAwarded === "number") {
    return q.scoreAwarded >= q.points;
  }
  const ref = q.correctAnswerText.trim();
  if (ref === "" || ref === "—") return false;
  return normalizeAnswerLine(q.userAnswerText) === normalizeAnswerLine(q.correctAnswerText);
}

function shouldShowReferenceAnswer(q: PlayerSubQuizReportQuestionRow): boolean {
  if (isQuestionFullyCorrect(q)) return false;
  const ref = q.correctAnswerText.trim();
  if (ref === "" || ref === "—") return false;
  return true;
}

/** Краткая подпись баллов для угла карточки: «+5» */
function pointsEarnedBadgeOrNull(q: PlayerSubQuizReportQuestionRow): string | null {
  if (q.scoreAwarded == null) return null;
  const earned = Math.trunc(q.scoreAwarded);
  if (earned === 0) return null;
  if (earned > 0) return `+${earned}`;
  return String(earned);
}

function leaderboardPositionLine(report: PlayerSubQuizReportPayload): string | null {
  const total = report.leaderboardTotal;
  if (total == null || total <= 0) return null;
  if (report.leaderboardPlace != null) {
    return `Ваше место в рейтинге: ${report.leaderboardPlace} из ${total}`;
  }
  return "В рейтинге этого квиза пока нет вашего результата";
}

export function PlayerQuizReportDialog(props: Props) {
  const { open, quizId, subQuizId, brandPrimaryColor, onClose } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<PlayerSubQuizReportPayload | null>(null);
  const reportRequestPendingRef = useRef(false);

  useEffect(() => {
    if (!open || !quizId) return;
    setLoading(true);
    setError("");
    setReport(null);
    reportRequestPendingRef.current = true;

    const onOk = (payload: { report?: PlayerSubQuizReportPayload }) => {
      if (!reportRequestPendingRef.current) return;
      reportRequestPendingRef.current = false;
      if (payload?.report) setReport(payload.report);
      setLoading(false);
    };
    const onErr = (evt: unknown) => {
      if (!reportRequestPendingRef.current) return;
      reportRequestPendingRef.current = false;
      const msg =
        typeof evt === "object" && evt !== null && "message" in evt
          ? String((evt as { message?: unknown }).message)
          : "Не удалось загрузить отчёт";
      setError(msg || "Не удалось загрузить отчёт");
      setLoading(false);
    };

    socket.once("player:sub-quiz-report", onOk);
    socket.once("error:message", onErr);
    socket.emit("player:sub-quiz-report:request", {
      quizId,
      subQuizId: subQuizId.trim() || undefined,
    });

    return () => {
      reportRequestPendingRef.current = false;
      socket.off("player:sub-quiz-report", onOk);
      socket.off("error:message", onErr);
    };
  }, [open, quizId, subQuizId]);

  const leaderboardLine = report ? leaderboardPositionLine(report) : null;
  const titleText = loading ? "Загрузка…" : report?.title?.trim() || "Квиз";
  const answeredQuestions = report?.questions.filter(isQuestionAnswered) ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: PLAYER_DIALOG_PAPER_SX }}
    >
      <DialogTitle sx={PLAYER_DIALOG_TITLE_SX}>
        <Box sx={{ minWidth: 0, pr: 1 }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {titleText}
          </Typography>
          {report && !loading ? (
            <Stack spacing={0.35} sx={{ mt: 0.75 }}>
              <Typography variant="body2" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
                Всего: {ruBallLabel(report.totalScore)}
              </Typography>
              {leaderboardLine ? (
                <Typography variant="body2" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
                  {leaderboardLine}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Box>
        <IconButton aria-label="Закрыть" onClick={onClose} size="small" sx={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={PLAYER_DIALOG_CONTENT_SX}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={40} sx={{ color: "#fff" }} />
          </Box>
        ) : error ? (
          <Typography sx={{ color: "#ff8a80" }}>{error}</Typography>
        ) : report && answeredQuestions.length === 0 ? (
          <Typography sx={PLAYER_DIALOG_SECONDARY_TEXT}>
            Пока нет отвеченных вопросов. Здесь появятся только те, на которые вы уже ответили.
          </Typography>
        ) : report ? (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            {answeredQuestions.map((q, idx, arr) => {
              const ok = isQuestionFullyCorrect(q);
              const showRef = shouldShowReferenceAnswer(q);
              const pointsBadge = pointsEarnedBadgeOrNull(q);
              return (
                <Stack key={q.questionId} spacing={1.5} sx={{ py: 0.25, position: "relative" }}>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ pr: pointsBadge ? 0.5 : 0 }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                      {ok ? (
                        <CheckCircleIcon sx={{ fontSize: 18, color: "#81c784" }} aria-hidden />
                      ) : (
                        <CancelIcon sx={{ fontSize: 18, color: "#e57373" }} aria-hidden />
                      )}
                      <Typography variant="caption" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
                        Вопрос {idx + 1}
                      </Typography>
                    </Stack>
                    {pointsBadge ? (
                      <Typography
                        component="span"
                        aria-label={
                          q.scoreAwarded != null ? ruBallLabel(q.scoreAwarded) : "Без баллов"
                        }
                        sx={{
                          flexShrink: 0,
                          color: brandPrimaryColor,
                          fontWeight: 800,
                          fontSize: { xs: "1.35rem", sm: "1.5rem" },
                          lineHeight: 1,
                          letterSpacing: -0.02,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pointsBadge}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: "1rem", lineHeight: 1.4, pr: pointsBadge ? 4 : 0 }}
                  >
                    {q.text}
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.45, wordBreak: "break-word" }}>
                    <Box component="span" sx={{ color: "rgba(255,255,255,0.75)" }}>
                      Ваш ответ:{" "}
                    </Box>
                    {q.userAnswerText}
                  </Typography>
                  {showRef ? (
                    <Typography
                      variant="body2"
                      sx={{
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        ...PLAYER_DIALOG_SECONDARY_TEXT,
                      }}
                    >
                      <Box component="span" sx={{ color: "rgba(255,255,255,0.75)" }}>
                        Верный ответ:{" "}
                      </Box>
                      {q.correctAnswerText}
                    </Typography>
                  ) : null}
                  {idx < arr.length - 1 ? (
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
                  ) : null}
                </Stack>
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
