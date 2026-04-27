import AddIcon from "@mui/icons-material/Add";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
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
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { isEditorQuizMode, type QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import type { PublicViewMode } from "../../publicViewContract";
import {
  runAdminQuestionRevealResultsFlow,
  runAdminQuestionSlideshowFlow,
} from "../../features/admin/adminQuestionProjectorFlow";
import { QuestionRowProjectorControls } from "./questionRow/QuestionRowProjectorControls";
import { QuestionRowQuickActions } from "./questionRow/QuestionRowQuickActions";
import { QuestionSettingsToolbar } from "./questionRow/QuestionSettingsToolbar";

type Props = {
  questionForms: QuestionForm[];
  selectedListIndex: number;
  remapQuestionIndex: (localIndex: number) => number;
  eventName: string;
  expandedQuestionSettingsIndex: number | null;
  setExpandedQuestionSettingsIndex: (
    value: number | null | ((current: number | null) => number | null),
  ) => void;
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
  listHeaderPrimaryAction?: { label: string; to: string } | { label: string; onClick: () => void };
  setPublicResultsView: (
    mode: "title" | "question" | "leaderboard" | "speaker_questions" | "reactions",
    questionIdForMode?: string,
  ) => void;
  updateQuestionShowVoteCount: (globalIndex: number, next: boolean) => void;
  updateQuestionShowCorrectOption: (globalIndex: number, next: boolean) => void;
  openTagInputDialog: (globalIndex: number) => void;
  openTagResultsDialog: (globalIndex: number) => void;
  confirmResetQuestionAnswersByIndex: (globalIndex: number) => void;
  toggleQuestion: (globalIndex: number, enabled: boolean) => void;
  updateQuestionProjectorShowFirstCorrect: (globalIndex: number, next: boolean) => void;
  patchQuestionProjectorFirstCorrectWinnersCount: (globalIndex: number, next: number) => void;
  commitQuestionProjectorFirstCorrectWinnersCount: (globalIndex: number, raw: number) => void;
  /** Метрика ранжирования на проекторе (PATCH без replace комнаты). */
  updateQuestionRankingProjectorMetric: (
    globalIndex: number,
    value: "avg_rank" | "avg_score" | "total_score",
  ) => void;
  /** Глобально для комнаты: показывать блок победителей на проекторе (кнопка-кубок). */
  showFirstCorrectAnswerer: boolean;
  updateShowFirstCorrectAnswerer: (next: boolean, questionIdForProjector?: string) => void;
  questionRevealStage: "options" | "results";
  setQuestionRevealStageForQuestion: (
    questionIdForProjector: string,
    stage: "options" | "results",
  ) => void;
  playerVisibleResultQuestionIds: string[];
  togglePlayerVisibleResultQuestionId: (questionId: string) => void;
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
    updateQuestionShowCorrectOption,
    openTagInputDialog,
    openTagResultsDialog,
    confirmResetQuestionAnswersByIndex,
    toggleQuestion,
    updateQuestionProjectorShowFirstCorrect,
    patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount,
    updateQuestionRankingProjectorMetric,
    showFirstCorrectAnswerer,
    updateShowFirstCorrectAnswerer,
    questionRevealStage,
    setQuestionRevealStageForQuestion,
    playerVisibleResultQuestionIds,
    togglePlayerVisibleResultQuestionId,
  } = props;

  function questionTypeLabel(type: QuestionForm["type"]) {
    if (type === "tag_cloud") return "Облако тегов";
    if (type === "ranking") return "Ранжирование";
    return "Голосование";
  }

  const settingsExpanded = (qIndex: number) => expandedQuestionSettingsIndex === qIndex;
  const hasHeader =
    Boolean(listHeaderPrimaryAction) || listHeaderShowAddButton || listTitle.trim().length > 0;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        {hasHeader ? (
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
                    ? {
                        component: RouterLink,
                        to: listHeaderPrimaryAction.to,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
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
        ) : null}
        <Box sx={{ px: 2, py: 1.5 }}>
          <List dense disablePadding sx={{ py: 0 }}>
            {questionForms.map((question, qIndex) => {
              const g = remapQuestionIndex(qIndex);
              const isOnProjector =
                publicViewMode === "question" && publicViewQuestionId === question.id;
              const chartsOnProjector =
                isOnProjector && !showFirstCorrectAnswerer && questionRevealStage === "options";
              const winnersOnProjector = isOnProjector && showFirstCorrectAnswerer;
              const revealButtonVisible = true;
              const revealResultsOnProjector =
                isOnProjector && !showFirstCorrectAnswerer && questionRevealStage === "results";
              const isStandaloneVote =
                question.subQuizId === null || question.subQuizId === undefined;
              const showStandaloneAdminBlock = isStandaloneVote && !!question.id;
              return (
                <Box
                  key={`q-list-${qIndex}`}
                  component="li"
                  sx={{ display: "block", listStyle: "none" }}
                >
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
                          <CloudQueueIcon
                            sx={{ fontSize: 18, display: "block", color: "common.white" }}
                          />
                        ) : question.type === "ranking" ? (
                          <FormatListNumberedIcon
                            sx={{ fontSize: 18, display: "block" }}
                            color="action"
                          />
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
                        bgcolor: "transparent",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
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
                        questionType={question.type}
                        questionOnProjector={isOnProjector}
                        chartsOnProjector={chartsOnProjector}
                        winnersOnProjector={winnersOnProjector}
                        revealButtonVisible={revealButtonVisible}
                        revealResultsOnProjector={revealResultsOnProjector}
                        showTrophyButton={Boolean(
                          showStandaloneAdminBlock &&
                          isEditorQuizMode(question) &&
                          (question.type !== "tag_cloud" || question.subQuizId == null) &&
                          !(question.type === "ranking" && question.rankingKind === "jury") &&
                          (question.projectorShowFirstCorrect ?? true),
                        )}
                        questionActive={Boolean(question.isActive)}
                        settingsExpanded={settingsExpanded(qIndex)}
                        onSlideshow={(event) => {
                          event.stopPropagation();
                          runAdminQuestionSlideshowFlow({
                            question,
                            revealResultsOnProjector,
                            chartsOnProjector,
                            setMessage,
                            setQuestionRevealStageForQuestion,
                            setPublicResultsView,
                          });
                        }}
                        onTrophy={(event) => {
                          event.stopPropagation();
                          if (!question.id) {
                            setMessage("Сначала сохраните вопрос");
                            return;
                          }
                          if (winnersOnProjector) {
                            setPublicResultsView("title");
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
                        onRevealResults={(event) => {
                          event.stopPropagation();
                          runAdminQuestionRevealResultsFlow({
                            question,
                            revealResultsOnProjector,
                            setMessage,
                            setQuestionRevealStageForQuestion,
                            setPublicResultsView,
                          });
                        }}
                      />
                    </ListItemButton>
                    <Collapse
                      in={expandedQuestionSettingsIndex === qIndex}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          mt: 1,
                        }}
                      >
                        <Stack spacing={1.2}>
                          <QuestionSettingsToolbar
                            question={question}
                            globalIndex={g}
                            updateQuestionShowVoteCount={updateQuestionShowVoteCount}
                            updateQuestionShowCorrectOption={updateQuestionShowCorrectOption}
                            openTagInputDialog={openTagInputDialog}
                            confirmResetQuestionAnswersByIndex={confirmResetQuestionAnswersByIndex}
                            playerResultsButtonVisible={
                              Boolean(question.id) && question.type !== "tag_cloud"
                            }
                            playerResultsVisible={
                              question.id
                                ? playerVisibleResultQuestionIds.includes(question.id)
                                : false
                            }
                            onTogglePlayerResults={() => {
                              if (!question.id) {
                                setMessage("Сначала сохраните вопрос");
                                return;
                              }
                              togglePlayerVisibleResultQuestionId(question.id);
                            }}
                          />
                          {showStandaloneAdminBlock &&
                          isEditorQuizMode(question) &&
                          question.type !== "tag_cloud" &&
                          showFirstCorrectAnswerer &&
                          !(question.type === "ranking" && question.rankingKind === "jury") ? (
                            <QuestionRowProjectorControls
                              projectorShowFirstCorrect={question.projectorShowFirstCorrect ?? true}
                              projectorFirstCorrectWinnersCount={
                                question.projectorFirstCorrectWinnersCount ?? 1
                              }
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
                          {question.type === "ranking" ? (
                            <TextField
                              select
                              label="Проектор: метрика"
                              size="small"
                              disabled={!question.id}
                              value={question.rankingProjectorMetric ?? "avg_score"}
                              onChange={(e) =>
                                updateQuestionRankingProjectorMetric(
                                  g,
                                  e.target.value as "avg_rank" | "avg_score" | "total_score",
                                )
                              }
                              sx={{ minWidth: 280, maxWidth: "100%" }}
                            >
                              <MenuItem value="avg_rank">Средний ранг</MenuItem>
                              <MenuItem value="avg_score">Средний балл (по варианту)</MenuItem>
                              <MenuItem value="total_score">Сумма баллов (по варианту)</MenuItem>
                            </TextField>
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
                              const displayedTags = [...tags, ...injected].sort(
                                (a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"),
                              );
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
                            if (question.type === "ranking") {
                              const answered = (result?.optionStats[0]?.count ?? 0) > 0;
                              const stats = result?.optionStats ?? [];
                              const metric = question.rankingProjectorMetric ?? "avg_score";
                              const hasTierStats = stats.some(
                                (o) =>
                                  typeof o.avgScore === "number" ||
                                  typeof o.totalScore === "number",
                              );
                              const mode =
                                metric !== "avg_rank" && !hasTierStats ? "avg_rank" : metric;
                              const headerLabel =
                                mode === "avg_rank"
                                  ? "Ср. место"
                                  : mode === "avg_score"
                                    ? "Ср. балл"
                                    : "Баллы";

                              const rows = question.options.map((option, index) => {
                                const liveOption = stats.find((item) => item.text === option.text);
                                return {
                                  key: `${qIndex}-${index}-${option.text}`,
                                  text: option.text || `Вариант ${index + 1}`,
                                  refRank: index + 1,
                                  liveOption,
                                };
                              });
                              if (!answered) {
                                return (
                                  <Typography variant="caption" color="text.secondary">
                                    Пока нет ответов
                                  </Typography>
                                );
                              }

                              if (mode === "avg_rank") {
                                const avgs = rows
                                  .map((r) => r.liveOption?.avgRank)
                                  .filter((v): v is number => typeof v === "number" && v > 0);
                                const minA = avgs.length ? Math.min(...avgs) : 0;
                                const maxA = avgs.length ? Math.max(...avgs) : 0;
                                return (
                                  <Stack spacing={0.8}>
                                    <Stack direction="row" justifyContent="flex-end">
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontWeight: 700 }}
                                      >
                                        {headerLabel}
                                      </Typography>
                                    </Stack>
                                    {rows.map((row) => {
                                      const avg =
                                        typeof row.liveOption?.avgRank === "number" &&
                                        row.liveOption.avgRank > 0
                                          ? row.liveOption.avgRank
                                          : null;
                                      const spread = maxA > minA ? maxA - minA : 1;
                                      const percent =
                                        avg != null && maxA > minA
                                          ? Math.round(((maxA - avg) / spread) * 100)
                                          : 50;
                                      return (
                                        <Box key={row.key} sx={{ py: 0.25 }}>
                                          <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            sx={{ mb: 0.25 }}
                                          >
                                            <Typography variant="caption" color="text.primary">
                                              {row.text}{" "}
                                              <Typography
                                                component="span"
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                (эталон: {row.refRank})
                                              </Typography>
                                            </Typography>
                                            <Typography variant="caption">
                                              {avg != null ? avg.toFixed(2) : "—"}
                                            </Typography>
                                          </Stack>
                                          <LinearProgress
                                            variant="determinate"
                                            value={percent}
                                            color="primary"
                                            sx={{ height: 6, borderRadius: 99 }}
                                          />
                                        </Box>
                                      );
                                    })}
                                  </Stack>
                                );
                              }

                              const scoreKey = mode === "avg_score" ? "avgScore" : "totalScore";
                              const vals = rows
                                .map((r) => r.liveOption?.[scoreKey])
                                .filter((v): v is number => typeof v === "number");
                              const maxV = vals.length ? Math.max(...vals, 0) : 0;

                              return (
                                <Stack spacing={0.8}>
                                  <Stack direction="row" justifyContent="flex-end">
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {headerLabel}
                                    </Typography>
                                  </Stack>
                                  {rows.map((row) => {
                                    const v = row.liveOption?.[scoreKey];
                                    const num = typeof v === "number" ? v : null;
                                    const denom = Math.max(maxV, 1e-9);
                                    const percent =
                                      num != null
                                        ? Math.round((Math.max(0, num) / denom) * 100)
                                        : 0;
                                    const display =
                                      num == null
                                        ? "—"
                                        : mode === "avg_score"
                                          ? num.toFixed(2)
                                          : String(Math.round(num));
                                    return (
                                      <Box key={row.key} sx={{ py: 0.25 }}>
                                        <Stack
                                          direction="row"
                                          justifyContent="space-between"
                                          sx={{ mb: 0.25 }}
                                        >
                                          <Typography variant="caption" color="text.primary">
                                            {row.text}{" "}
                                            <Typography
                                              component="span"
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              (эталон: {row.refRank})
                                            </Typography>
                                          </Typography>
                                          <Typography variant="caption">{display}</Typography>
                                        </Stack>
                                        <LinearProgress
                                          variant="determinate"
                                          value={percent}
                                          color="primary"
                                          sx={{ height: 6, borderRadius: 99 }}
                                        />
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              );
                            }
                            const bars = question.options.map((option, index) => {
                              const liveOption = result?.optionStats.find(
                                (item) => item.text === option.text,
                              );
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
                                  const percent =
                                    totalVotes > 0
                                      ? Math.round((option.count / totalVotes) * 100)
                                      : 0;
                                  return (
                                    <Box key={option.key} sx={{ py: 0.25 }}>
                                      <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        sx={{ mb: 0.25 }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color={option.isCorrect ? "success.main" : "text.primary"}
                                        >
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
                    <Divider
                      component="div"
                      role="separator"
                      sx={{ borderColor: "divider", my: 1 }}
                    />
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
