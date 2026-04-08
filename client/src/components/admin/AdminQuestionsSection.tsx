import AddIcon from "@mui/icons-material/Add";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import type { QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import type { PublicViewMode } from "../../publicViewContract";
import { QuestionRowProjectorControls } from "./questionRow/QuestionRowProjectorControls";
import { QuestionRowQuickActions } from "./questionRow/QuestionRowQuickActions";
import { QuestionSettingsToolbar } from "./questionRow/QuestionSettingsToolbar";

type Props = {
  questionForms: QuestionForm[];
  selectedListIndex: number;
  remapQuestionIndex: (localIndex: number) => number;
  eventName: string;
  expandedQuestionSettingsIndex: number | null;
  setExpandedQuestionSettingsIndex: (value: number | null | ((current: number | null) => number | null)) => void;
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId: string | undefined;
  setMessage: (value: string) => void;
  openQuestionDialog: (globalIndex: number) => void;
  addQuestion: () => void;
  /** Заголовок карточки списка вопросов */
  listTitle?: string;
  /** Подпись кнопки добавления */
  addButtonLabel?: string;
  /** Показать кнопку добавления в шапке карточки (если false — только заголовок) */
  listHeaderShowAddButton?: boolean;
  /** Если задано — слева кнопка вместо заголовка (например, результаты квиза) */
  listHeaderPrimaryAction?:
    | { label: string; to: string }
    | { label: string; onClick: () => void };
  setPublicResultsView: (mode: "title" | "question" | "leaderboard", questionIdForMode?: string) => void;
  updateQuestionShowVoteCount: (globalIndex: number, next: boolean) => void;
  updateQuestionShowTitle: (globalIndex: number, next: boolean) => void;
  openTagInputDialog: (globalIndex: number) => void;
  openTagResultsDialog: (globalIndex: number) => void;
  confirmResetQuestionAnswersByIndex: (globalIndex: number) => void;
  toggleQuestion: (globalIndex: number, enabled: boolean) => void;
  updateQuestionProjectorShowFirstCorrect: (globalIndex: number, next: boolean) => void;
  patchQuestionProjectorFirstCorrectWinnersCount: (globalIndex: number, next: number) => void;
  commitQuestionProjectorFirstCorrectWinnersCount: (globalIndex: number, raw: number) => void;
  /** Глобально для комнаты: показывать блок победителей на проекторе (кнопка-кубок). */
  showFirstCorrectAnswerer: boolean;
  updateShowFirstCorrectAnswerer: (next: boolean, questionIdForProjector?: string) => void;
};

export function AdminQuestionsSection(props: Props) {
  const {
    questionForms,
    selectedListIndex,
    remapQuestionIndex,
    eventName,
    expandedQuestionSettingsIndex,
    setExpandedQuestionSettingsIndex,
    questionResults,
    publicViewMode,
    publicViewQuestionId,
    setMessage,
    openQuestionDialog,
    addQuestion,
    listTitle = "Вопросы на этом листе",
    addButtonLabel = "Вопрос",
    listHeaderShowAddButton = true,
    listHeaderPrimaryAction,
    setPublicResultsView,
    updateQuestionShowVoteCount,
    updateQuestionShowTitle,
    openTagInputDialog,
    openTagResultsDialog,
    confirmResetQuestionAnswersByIndex,
    toggleQuestion,
    updateQuestionProjectorShowFirstCorrect,
    patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount,
    showFirstCorrectAnswerer,
    updateShowFirstCorrectAnswerer,
  } = props;

  function questionTypeLabel(type: QuestionForm["type"]) {
    if (type === "tag_cloud") return "Облако тегов";
    return "Голосование";
  }

  const settingsExpanded = (qIndex: number) => expandedQuestionSettingsIndex === qIndex;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            {listHeaderPrimaryAction ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LeaderboardIcon />}
                sx={{ textTransform: "none" }}
                {...("to" in listHeaderPrimaryAction
                  ? { component: RouterLink, to: listHeaderPrimaryAction.to }
                  : { onClick: listHeaderPrimaryAction.onClick })}
              >
                {listHeaderPrimaryAction.label}
              </Button>
            ) : (
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {listTitle}
              </Typography>
            )}
            {listHeaderShowAddButton ? (
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={addQuestion}
                  sx={{ textTransform: "none" }}
                >
                  {addButtonLabel}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </Box>
        <Box sx={{ px: 2, py: 1.5 }}>
          <List dense disablePadding sx={{ py: 0 }}>
            {questionForms.map((question, qIndex) => {
              const g = remapQuestionIndex(qIndex);
              const isOnProjector = publicViewMode === "question" && publicViewQuestionId === question.id;
              const chartsOnProjector = isOnProjector && !showFirstCorrectAnswerer;
              const winnersOnProjector = isOnProjector && showFirstCorrectAnswerer;
              const isStandaloneVote = question.subQuizId === null || question.subQuizId === undefined;
              const showStandaloneAdminBlock = isStandaloneVote && !!question.id;
              return (
              <Box key={`q-list-${qIndex}`} component="li" sx={{ display: "block", listStyle: "none" }}>
                <Box sx={{ position: "relative" }}>
                <Tooltip title={questionTypeLabel(question.type)} enterTouchDelay={400}>
                  <Box
                    component="span"
                    aria-hidden
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: 2,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      cursor: "help",
                      m: 0,
                      p: 0,
                      lineHeight: 0,
                    }}
                  >
                    {question.type === "tag_cloud" ? (
                      <CloudQueueIcon sx={{ fontSize: 18, display: "block" }} color="info" />
                    ) : (
                      <HowToVoteIcon sx={{ fontSize: 18, display: "block" }} color="action" />
                    )}
                  </Box>
                </Tooltip>
                <ListItemButton
                  disableGutters
                  selected={false}
                  onClick={() => openQuestionDialog(g)}
                  aria-label={`${questionTypeLabel(question.type)}: ${question.text.trim() || "Без текста"}`}
                  aria-selected={selectedListIndex === qIndex}
                  sx={{
                    alignItems: "center",
                    gap: 1,
                    py: 0,
                    px: 0,
                    pl: 2.5,
                    pr: 0,
                    minHeight: 0,
                    borderRadius: 0,
                    ...(isOnProjector
                      ? {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.1),
                          "&:hover": {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.14),
                          },
                        }
                      : {
                          bgcolor: "transparent",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }),
                  }}
                >
                  <ListItemText
                    primary={question.text.trim() || "Без текста"}
                    slotProps={{
                      primary: {
                        variant: "body2",
                        noWrap: true,
                        title: question.text.trim() || undefined,
                      },
                    }}
                    sx={{ flex: "1 1 auto", minWidth: 0, my: 0 }}
                  />
                  <QuestionRowQuickActions
                    chartsOnProjector={chartsOnProjector}
                    winnersOnProjector={winnersOnProjector}
                    showTrophyButton={Boolean(
                      showStandaloneAdminBlock &&
                        question.type !== "tag_cloud" &&
                        (question.projectorShowFirstCorrect ?? true),
                    )}
                    questionActive={Boolean(question.isActive)}
                    settingsExpanded={settingsExpanded(qIndex)}
                    onSlideshow={(event) => {
                      event.stopPropagation();
                      if (!question.id) {
                        setMessage("Сначала сохраните вопрос");
                        return;
                      }
                      setPublicResultsView(chartsOnProjector ? "title" : "question", question.id);
                    }}
                    onTrophy={(event) => {
                      event.stopPropagation();
                      if (!question.id) {
                        setMessage("Сначала сохраните вопрос");
                        return;
                      }
                      if (winnersOnProjector) {
                        updateShowFirstCorrectAnswerer(false);
                      } else {
                        updateShowFirstCorrectAnswerer(true, question.id);
                      }
                    }}
                    onToggleActive={(event) => {
                      event.stopPropagation();
                      toggleQuestion(g, !question.isActive);
                    }}
                    onToggleSettings={(event) => {
                      event.stopPropagation();
                      setExpandedQuestionSettingsIndex((current) =>
                        current === qIndex ? null : qIndex,
                      );
                    }}
                  />
                </ListItemButton>
                <Collapse in={expandedQuestionSettingsIndex === qIndex} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 1.5, py: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, mt: 1 }}>
                    <Stack spacing={1.2}>
                      <QuestionSettingsToolbar
                        question={question}
                        globalIndex={g}
                        updateQuestionShowVoteCount={updateQuestionShowVoteCount}
                        updateQuestionShowTitle={updateQuestionShowTitle}
                        openTagInputDialog={openTagInputDialog}
                        confirmResetQuestionAnswersByIndex={confirmResetQuestionAnswersByIndex}
                      />
                      {showStandaloneAdminBlock && question.type !== "tag_cloud" ? (
                        <QuestionRowProjectorControls
                          projectorShowFirstCorrect={question.projectorShowFirstCorrect ?? true}
                          projectorFirstCorrectWinnersCount={question.projectorFirstCorrectWinnersCount ?? 1}
                          onProjectorShowFirstCorrectChange={(checked) => {
                            void updateQuestionProjectorShowFirstCorrect(g, checked);
                          }}
                          onWinnersCountPatch={(n) => {
                            patchQuestionProjectorFirstCorrectWinnersCount(g, n);
                          }}
                          onWinnersCountCommit={(raw) => {
                            void commitQuestionProjectorFirstCorrectWinnersCount(g, raw);
                          }}
                        />
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        Результаты вопроса
                      </Typography>
                      {(() => {
                        const result = question.id
                          ? questionResults.find((item) => item.questionId === question.id)
                          : undefined;
                        if (question.type === "tag_cloud") {
                          const tags = result?.tagCloud ?? [];
                          const injected = question.injectedTagWords ?? [];
                          const displayedTags = [...tags, ...injected].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));
                          return (
                            <Stack spacing={0.5}>
                              {displayedTags.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                  Пока нет ответов
                                </Typography>
                              ) : (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => openTagResultsDialog(g)}
                                  sx={{ alignSelf: "flex-start", px: 0.5 }}
                                >
                                  Открыть список результатов ({displayedTags.length})
                                </Button>
                              )}
                            </Stack>
                          );
                        }
                        const bars = question.options.map((option, index) => {
                          const liveOption = result?.optionStats.find((item) => item.text === option.text);
                          return {
                            key: `${qIndex}-${index}-${option.text}`,
                            text: option.text || `Вариант ${index + 1}`,
                            isCorrect: option.isCorrect,
                            count: liveOption?.count ?? 0,
                          };
                        });
                        const totalVotes = bars.reduce((sum, option) => sum + option.count, 0);
                        return (
                          <Stack spacing={0.8}>
                            {bars.map((option) => {
                              const percent = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
                              return (
                                <Box key={option.key} sx={{ py: 0.25 }}>
                                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                    <Typography variant="caption" color={option.isCorrect ? "success.main" : "text.primary"}>
                                      {option.text} {option.isCorrect ? "(правильный)" : ""}
                                    </Typography>
                                    <Typography variant="caption">{option.count}</Typography>
                                  </Stack>
                                  <LinearProgress
                                    variant="determinate"
                                    value={percent}
                                    color={option.isCorrect ? "success" : "primary"}
                                    sx={{ height: 6, borderRadius: 99 }}
                                  />
                                </Box>
                              );
                            })}
                          </Stack>
                        );
                      })()}
                      {showStandaloneAdminBlock ? (
                        <Button
                          component={RouterLink}
                          to={`/admin/${eventName}/votes/${question.id}`}
                          endIcon={<OpenInNewIcon />}
                          size="small"
                          variant="outlined"
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Подробно
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                </Collapse>
                </Box>
                {qIndex < questionForms.length - 1 && (
                  <Divider component="div" role="separator" sx={{ borderColor: "divider", my: 1 }} />
                )}
              </Box>
              );
            })}
          </List>
        </Box>
      </CardContent>
    </Card>
  );
}
