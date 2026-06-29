import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  PLAYER_POPUP_ALIGN_SX,
  PLAYER_POPUP_CARD_SX,
  PLAYER_POPUP_OVERLAY_SX,
} from "./playerDialogStyles";
import { playerPopupQuestionTitleSx } from "../../features/voteUi/voteQuestionLayout";
import { getQuestionTypeLabel } from "../../pages/quiz-play/getQuestionTypeLabel";
import type { ActiveQuestion, QuizState } from "../../pages/quiz-play/types";
import { PlayerRankingOptionsList } from "./PlayerRankingOptionsList";
import { PlayerVoteOptionsGrid } from "./PlayerVoteOptionsGrid";
import { QuestionAssetImage } from "./QuestionAssetImage";

export type QuestionPopupCardProps = {
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  question: ActiveQuestion;
  quizProgress: QuizState["quizProgress"];
  displayedSelected: string[];
  answeredCurrentQuestion: boolean;
  submittedAnswers: Record<string, string[]>;
  rankOrder: string[];
  rankRowRefs: RefObject<Map<string, HTMLDivElement>>;
  moveRankOption: (optionId: string, direction: -1 | 1) => void;
  toggleOption: (id: string) => void;
  closeQuestionPopup: () => void;
  tagAnswers: string[];
  setTagAnswers: Dispatch<SetStateAction<string[]>>;
  canSubmit: boolean;
  submit: () => void;
  ruBallLabel: (n: number) => string;
};

export function QuestionPopupCard(props: QuestionPopupCardProps) {
  const {
    brandPrimaryColor,
    playerVoteOptionTextColor,
    question,
    quizProgress,
    displayedSelected,
    answeredCurrentQuestion,
    submittedAnswers,
    rankOrder,
    rankRowRefs,
    moveRankOption,
    toggleOption,
    closeQuestionPopup,
    tagAnswers,
    setTagAnswers,
    canSubmit,
    submit,
    ruBallLabel,
  } = props;
  const rankingHintRaw = question.rankingPlayerHint?.trim() ?? "";
  const rankingHint =
    rankingHintRaw ===
    "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется."
      ? "Расставьте варианты от лучшего к худшему."
      : rankingHintRaw;
  const questionLength = question.text.trim().length;
  const metaChipSx = {
    height: 24,
    color: "inherit",
    bgcolor: "transparent",
    border: "none",
    borderRadius: 0,
    borderBottom: `2px solid ${brandPrimaryColor}`,
    "& .MuiChip-label": { px: 1, fontSize: "0.72rem", fontWeight: 600, color: "inherit" },
    "& .MuiChip-icon": { color: "inherit" },
  } as const;
  const questionTypeBubbleSx = {
    alignSelf: "flex-start",
    height: "auto",
    borderRadius: 999,
    bgcolor: brandPrimaryColor,
    color: playerVoteOptionTextColor,
    border: "none",
    "& .MuiChip-label": {
      px: 1.5,
      py: 0.6,
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: 1.25,
      whiteSpace: "normal",
      color: playerVoteOptionTextColor,
    },
  } as const;

  return (
    <Box sx={{ ...PLAYER_POPUP_OVERLAY_SX, zIndex: 1400 }}>
      <Box sx={PLAYER_POPUP_ALIGN_SX}>
        <Card variant="outlined" sx={PLAYER_POPUP_CARD_SX}>
          <CardContent sx={{ bgcolor: "transparent", color: "inherit" }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                {question.scoringMode !== "poll" && quizProgress && quizProgress.total > 0 ? (
                  <Chip
                    label={`Вопрос ${quizProgress.index} / ${quizProgress.total}`}
                    size="small"
                    sx={metaChipSx}
                  />
                ) : (
                  <Box />
                )}
                <IconButton
                  aria-label="Закрыть"
                  size="small"
                  onClick={closeQuestionPopup}
                  sx={{ color: "#fff" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={3.5} sx={{ width: "100%" }}>
                <Stack spacing={1}>
                  {question.imageUrl ? (
                    <QuestionAssetImage
                      url={question.imageUrl}
                      alt={question.text.trim() || "Вопрос"}
                      maxHeight={240}
                    />
                  ) : null}
                  {question.text.trim() ? (
                    <Typography variant="h4" sx={playerPopupQuestionTitleSx(questionLength)}>
                      {question.text}
                    </Typography>
                  ) : null}
                  {question.type !== "temperature" ? (
                    <Chip
                      label={getQuestionTypeLabel(question)}
                      size="small"
                      sx={questionTypeBubbleSx}
                    />
                  ) : null}
                </Stack>
                {question.type !== "tag_cloud" && question.type !== "ranking" && (
                  <PlayerVoteOptionsGrid
                    options={question.options}
                    displayedSelected={displayedSelected}
                    answeredCurrentQuestion={answeredCurrentQuestion}
                    brandPrimaryColor={brandPrimaryColor}
                    playerVoteOptionTextColor={playerVoteOptionTextColor}
                    onToggleOption={toggleOption}
                  />
                )}
                {question.type === "ranking" && (
                  <PlayerRankingOptionsList
                    question={question}
                    rankingHint={rankingHint}
                    answeredCurrentQuestion={answeredCurrentQuestion}
                    submittedAnswers={submittedAnswers}
                    rankOrder={rankOrder}
                    rankRowRefs={rankRowRefs}
                    moveRankOption={moveRankOption}
                    ruBallLabel={ruBallLabel}
                  />
                )}
                {question.type === "tag_cloud" && (
                  <Stack spacing={1.5}>
                    {(answeredCurrentQuestion
                      ? (submittedAnswers[question.id] ?? [])
                      : tagAnswers
                    ).map((value, index) => (
                      <Stack
                        key={`tag-answer-${index}`}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <TextField
                          value={value}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            const limit = question.maxAnswers ?? 5;
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
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": {
                              color: "#fff",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.35)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.55)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: brandPrimaryColor,
                                borderWidth: 2,
                              },
                            },
                          }}
                        />
                        {!answeredCurrentQuestion && index > 0 && (
                          <IconButton
                            aria-label="Удалить ответ"
                            color="inherit"
                            onClick={() =>
                              setTagAnswers((prev) =>
                                prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
                              )
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
            </Stack>
            <Box sx={{ pt: 3.5 }}>
              <Button
                disabled={!canSubmit}
                onClick={submit}
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  minHeight: 52,
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: playerVoteOptionTextColor,
                  bgcolor: brandPrimaryColor,
                  "&:hover": { bgcolor: alpha(brandPrimaryColor, 0.88) },
                }}
              >
                Отправить ответ
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
