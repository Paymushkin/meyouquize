import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { isEditorQuizMode, type QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import type { PublicViewMode } from "../../publicViewContract";
import {
  hasOptionVoteCountOverride,
  resolveOptionDisplayCount,
  computeTemperatureWeightedAverage,
} from "@meyouquize/shared";
import {
  runAdminQuestionRevealResultsFlow,
  runAdminQuestionSlideshowFlow,
} from "../../features/admin/adminQuestionProjectorFlow";
import { QuestionRowProjectorControls } from "./questionRow/QuestionRowProjectorControls";
import { QuestionRowQuickActions } from "./questionRow/QuestionRowQuickActions";
import { QuestionSettingsToolbar } from "./questionRow/QuestionSettingsToolbar";
import { VoteCountAdjustControls } from "./VoteCountAdjustControls";

function QuestionVoterTotalRow({ total }: { total: number }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Всего
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {total}
      </Typography>
    </Stack>
  );
}

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
  updateOptionVoteCountOverride: (globalIndex: number, optionId: string, nextCount: number) => void;
  clearOptionVoteCountOverride: (globalIndex: number, optionId: string) => void;
  resetOptionVoteCountOverrides: (globalIndex: number) => void;
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
  /** Перенос в «отработанные» / обратно (только голосования комнаты). */
  adminDoneToggle?: {
    mode: "markDone" | "markActive";
    onToggle: (globalIndex: number) => void;
  };
  /** Режим управления списком: перенос и порядок (голосования комнаты). */
  voteListManageMode?: boolean;
  /** Кнопка в шапке «Актуальные» для вкл/выкл режима. */
  voteListManageToggle?: {
    enabled: boolean;
    onToggle: () => void;
  };
  onReorderVoteInList?: (fromLocalIndex: number, toLocalIndex: number) => void;
  /** Клонировать голосование комнаты (вкладка «Голосования»). */
  onCloneQuestion?: (globalIndex: number) => void;
};

function questionSupportsVoteAdjust(type: QuestionForm["type"]): boolean {
  return type !== "tag_cloud" && type !== "ranking";
}

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
    updateOptionVoteCountOverride,
    clearOptionVoteCountOverride,
    resetOptionVoteCountOverrides,
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
    adminDoneToggle,
    voteListManageMode = false,
    voteListManageToggle,
    onReorderVoteInList,
    onCloneQuestion,
  } = props;

  const [dragLocalIndex, setDragLocalIndex] = useState<number | null>(null);
  const [dropLocalIndex, setDropLocalIndex] = useState<number | null>(null);

  const [voteAdjustEditIndices, setVoteAdjustEditIndices] = useState<Set<number>>(() => new Set());

  function toggleVoteAdjustEdit(globalIndex: number) {
    setVoteAdjustEditIndices((current) => {
      const next = new Set(current);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  }

  function questionTypeLabel(type: QuestionForm["type"]) {
    if (type === "tag_cloud") return "Облако тегов";
    if (type === "ranking") return "Ранжирование";
    if (type === "temperature") return "Температура";
    return "Голосование";
  }

  const settingsExpanded = (globalIndex: number) => expandedQuestionSettingsIndex === globalIndex;
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
              {voteListManageToggle || listHeaderShowAddButton ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  {voteListManageToggle ? (
                    <Tooltip
                      title={
                        voteListManageToggle.enabled
                          ? "Скрыть управление списком"
                          : "Управление списком"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={voteListManageToggle.onToggle}
                        aria-label="Управление списком голосований"
                        aria-pressed={voteListManageToggle.enabled}
                        color={voteListManageToggle.enabled ? "primary" : "default"}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {listHeaderShowAddButton ? (
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      size="small"
                      onClick={addQuestion}
                      sx={{ textTransform: "none" }}
                    >
                      {addButtonLabel}
                    </Button>
                  ) : null}
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
                  key={question.id ?? `q-list-${g}`}
                  component="li"
                  sx={{ display: "block", listStyle: "none" }}
                  onDragOver={(event) => {
                    if (!voteListManageMode || !onReorderVoteInList || dragLocalIndex === null) {
                      return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropLocalIndex(qIndex);
                  }}
                  onDragLeave={() => {
                    setDropLocalIndex((current) => (current === qIndex ? null : current));
                  }}
                  onDrop={(event) => {
                    if (!voteListManageMode || !onReorderVoteInList || dragLocalIndex === null) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    if (dragLocalIndex !== qIndex) {
                      onReorderVoteInList(dragLocalIndex, qIndex);
                    }
                    setDragLocalIndex(null);
                    setDropLocalIndex(null);
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 1,
                      outline:
                        dropLocalIndex === qIndex && dragLocalIndex !== qIndex
                          ? "2px dashed"
                          : "none",
                      outlineColor: "primary.main",
                      outlineOffset: -2,
                      opacity: dragLocalIndex === qIndex ? 0.55 : 1,
                    }}
                  >
                    <ListItemButton
                      disableGutters
                      selected={false}
                      onClick={() => openQuestionDialog(g)}
                      aria-label={`${questionTypeLabel(question.type)}: ${question.text.trim() || "Без текста"}`}
                      aria-selected={selectedListIndex === qIndex}
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        py: 0,
                        px: 0,
                        minHeight: 0,
                        borderRadius: 0,
                        bgcolor: "transparent",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          justifyContent: "flex-start",
                          alignItems: "center",
                          gap: 1.25,
                          py: 0.5,
                        }}
                      >
                        {voteListManageMode && adminDoneToggle ? (
                          <Tooltip
                            title={
                              !question.id
                                ? "Сначала сохраните вопрос"
                                : adminDoneToggle.mode === "markActive"
                                  ? "Вернуть в актуальные"
                                  : "В отработанные"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={!question.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  adminDoneToggle.onToggle(g);
                                }}
                                aria-label={
                                  adminDoneToggle.mode === "markActive"
                                    ? "Вернуть в актуальные"
                                    : "В отработанные"
                                }
                                sx={{ flexShrink: 0, p: 0.25 }}
                              >
                                {adminDoneToggle.mode === "markActive" ? (
                                  <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                                ) : (
                                  <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                        {voteListManageMode && onReorderVoteInList ? (
                          <Tooltip title="Перетащите для изменения порядка">
                            <Box
                              component="span"
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                setDragLocalIndex(qIndex);
                                setDropLocalIndex(null);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(qIndex));
                              }}
                              onDragEnd={() => {
                                setDragLocalIndex(null);
                                setDropLocalIndex(null);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                flexShrink: 0,
                                cursor: "grab",
                                color: "text.secondary",
                                touchAction: "none",
                              }}
                            >
                              <DragIndicatorIcon sx={{ fontSize: 20 }} />
                            </Box>
                          </Tooltip>
                        ) : null}
                        <Tooltip title={questionTypeLabel(question.type)} enterTouchDelay={400}>
                          <Box
                            component="span"
                            aria-hidden
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              cursor: "help",
                              lineHeight: 0,
                            }}
                          >
                            {question.type === "tag_cloud" ? (
                              <CloudQueueIcon
                                sx={{ fontSize: 16, display: "block", color: "common.white" }}
                              />
                            ) : question.type === "ranking" ? (
                              <FormatListNumberedIcon
                                sx={{ fontSize: 16, display: "block" }}
                                color="action"
                              />
                            ) : (
                              <HowToVoteIcon
                                sx={{ fontSize: 16, display: "block" }}
                                color="action"
                              />
                            )}
                          </Box>
                        </Tooltip>
                        <Typography
                          component="span"
                          variant="body2"
                          noWrap
                          title={question.text.trim() || undefined}
                          sx={{ minWidth: 0, textAlign: "left" }}
                        >
                          {question.text.trim() || "Без текста"}
                        </Typography>
                      </Box>
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
                        settingsExpanded={settingsExpanded(g)}
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
                          setExpandedQuestionSettingsIndex((current) => (current === g ? null : g));
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
                    <Collapse in={expandedQuestionSettingsIndex === g} timeout="auto" unmountOnExit>
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
                            showRestoreVoteResults={
                              voteAdjustEditIndices.has(g) &&
                              (question.optionVoteCountOverrides?.length ?? 0) > 0
                            }
                            onRestoreVoteResults={() => resetOptionVoteCountOverrides(g)}
                            showVoteAdjustToggle={questionSupportsVoteAdjust(question.type)}
                            voteAdjustEditVisible={voteAdjustEditIndices.has(g)}
                            onToggleVoteAdjustEdit={() => toggleVoteAdjustEdit(g)}
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
                          {(() => {
                            const voteAdjustEditVisible = voteAdjustEditIndices.has(g);
                            const result = question.id
                              ? questionResults.find((item) => item.questionId === question.id)
                              : undefined;
                            const voterTotal = result?.answerCount ?? 0;
                            if (question.type === "tag_cloud") {
                              const tags = result?.tagCloud ?? [];
                              const injected = question.injectedTagWords ?? [];
                              const displayedTags = [...tags, ...injected].sort(
                                (a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"),
                              );
                              return (
                                <Stack spacing={0.5}>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => openTagResultsDialog(g)}
                                    sx={{ alignSelf: "flex-start", px: 0.5 }}
                                  >
                                    Открыть список результатов ({displayedTags.length})
                                  </Button>
                                </Stack>
                              );
                            }
                            if (question.type === "ranking") {
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
                                            alignItems="center"
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
                                    <QuestionVoterTotalRow total={voterTotal} />
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
                                          alignItems="center"
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
                                  <QuestionVoterTotalRow total={voterTotal} />
                                </Stack>
                              );
                            }
                            if (question.type === "temperature") {
                              const stats = result?.optionStats ?? [];
                              const overrides = question.optionVoteCountOverrides ?? [];
                              const bars = question.options.map((option, index) => {
                                const liveOption = stats.find((item) => item.text === option.text);
                                const optionId = option.id ?? `${qIndex}-${index}`;
                                const liveCount = liveOption?.count ?? 0;
                                return {
                                  key: `${qIndex}-${index}-${option.text}`,
                                  optionId,
                                  text: option.text || `Вариант ${index + 1}`,
                                  weight: option.weight ?? liveOption?.weight,
                                  count: resolveOptionDisplayCount(optionId, liveCount, overrides),
                                };
                              });
                              const totalVotes = bars.reduce(
                                (sum, option) => sum + option.count,
                                0,
                              );
                              const temperatureValue = computeTemperatureWeightedAverage(
                                bars.map((option) => ({
                                  count: option.count,
                                  weight: option.weight ?? 0,
                                })),
                              );
                              const tempLabel =
                                temperatureValue != null
                                  ? `Температура: ${temperatureValue}`
                                  : null;
                              return (
                                <Stack spacing={0.8}>
                                  {tempLabel ? (
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                      {tempLabel}
                                    </Typography>
                                  ) : null}
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
                                          alignItems="center"
                                          sx={{ mb: 0.25 }}
                                        >
                                          <Typography variant="caption" color="text.primary">
                                            {option.text}
                                            {option.weight != null ? ` (вес ${option.weight})` : ""}
                                          </Typography>
                                          {voteAdjustEditVisible ? (
                                            <VoteCountAdjustControls
                                              count={option.count}
                                              hasOverride={hasOptionVoteCountOverride(
                                                overrides,
                                                option.optionId,
                                              )}
                                              onDecrement={() =>
                                                updateOptionVoteCountOverride(
                                                  g,
                                                  option.optionId,
                                                  option.count - 1,
                                                )
                                              }
                                              onIncrement={() =>
                                                updateOptionVoteCountOverride(
                                                  g,
                                                  option.optionId,
                                                  option.count + 1,
                                                )
                                              }
                                              onRestore={() =>
                                                clearOptionVoteCountOverride(g, option.optionId)
                                              }
                                            />
                                          ) : (
                                            <Typography variant="caption">
                                              {option.count}
                                            </Typography>
                                          )}
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
                                  <QuestionVoterTotalRow total={totalVotes} />
                                </Stack>
                              );
                            }
                            const overrides = question.optionVoteCountOverrides ?? [];
                            const bars = question.options.map((option, index) => {
                              const liveOption = result?.optionStats.find(
                                (item) => item.text === option.text,
                              );
                              const optionId = option.id ?? `${qIndex}-${index}`;
                              const liveCount = liveOption?.count ?? 0;
                              return {
                                key: `${qIndex}-${index}-${option.text}`,
                                optionId,
                                text: option.text || `Вариант ${index + 1}`,
                                isCorrect: option.isCorrect,
                                count: resolveOptionDisplayCount(optionId, liveCount, overrides),
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
                                        alignItems="center"
                                        sx={{ mb: 0.25 }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color={option.isCorrect ? "success.main" : "text.primary"}
                                        >
                                          {option.text} {option.isCorrect ? "(правильный)" : ""}
                                        </Typography>
                                        {voteAdjustEditVisible ? (
                                          <VoteCountAdjustControls
                                            count={option.count}
                                            hasOverride={hasOptionVoteCountOverride(
                                              overrides,
                                              option.optionId,
                                            )}
                                            onDecrement={() =>
                                              updateOptionVoteCountOverride(
                                                g,
                                                option.optionId,
                                                option.count - 1,
                                              )
                                            }
                                            onIncrement={() =>
                                              updateOptionVoteCountOverride(
                                                g,
                                                option.optionId,
                                                option.count + 1,
                                              )
                                            }
                                            onRestore={() =>
                                              clearOptionVoteCountOverride(g, option.optionId)
                                            }
                                          />
                                        ) : (
                                          <Typography variant="caption">{option.count}</Typography>
                                        )}
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
                                <QuestionVoterTotalRow total={totalVotes} />
                              </Stack>
                            );
                          })()}
                          {showStandaloneAdminBlock || onCloneQuestion ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignSelf="flex-start"
                              flexWrap="wrap"
                            >
                              {showStandaloneAdminBlock ? (
                                <Button
                                  component={RouterLink}
                                  to={`/admin/${eventName}/votes/${question.id}`}
                                  endIcon={<OpenInNewIcon />}
                                  size="small"
                                  variant="outlined"
                                >
                                  Подробно
                                </Button>
                              ) : null}
                              {onCloneQuestion && isStandaloneVote ? (
                                <Button
                                  startIcon={<ContentCopyIcon />}
                                  size="small"
                                  variant="outlined"
                                  disabled={!question.id}
                                  onClick={() => onCloneQuestion(g)}
                                >
                                  Клонировать
                                </Button>
                              ) : null}
                            </Stack>
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
