import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ForumIcon from "@mui/icons-material/Forum";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import QuizIcon from "@mui/icons-material/Quiz";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Dispatch, DragEvent, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  buildQuestionIndexMapForSubQuiz,
  buildVotesDisplayBlocks,
  filterVotesDisplayBlocks,
  type QuestionForm,
  type SubQuizSheet,
} from "../../admin/adminEventForm";
import { AdminFeedbackSection } from "../../components/admin/AdminFeedbackSection";
import { AdminQuestionsSection } from "../../components/admin/AdminQuestionsSection";
import { AdminRandomizerSection } from "../../components/admin/AdminRandomizerSection";
import { AdminReactionsSection } from "../../components/admin/AdminReactionsSection";
import { SubQuizControlsCard } from "../../components/admin/SubQuizControlsCard";
import type { AdminQuestionsSectionSharedBindings } from "../../features/admin/adminQuestionsSectionSharedBindings";
import type { RoomQuestionsTab } from "../../features/admin/adminUiPersistence";
import type { useAdminRandomizer } from "../../features/admin/useAdminRandomizer";
import type { useAdminReactions } from "../../features/admin/useAdminReactions";
import type { useAdminPlayerTiles } from "../../features/admin/useAdminPlayerTiles";
import type { AdminSetPublicResultsView } from "../../features/admin/useAdminRandomizer";
import {
  isStaleParticipantSnapshot,
  parseNames,
  randomizerNamesTextForPublicView,
} from "../../features/randomizer/randomizerLogic";
import type { PublicViewMode, PublicViewSetPatch } from "../../publicViewContract";
import { socket } from "../../socket";
import type { FeedbackFormConfig } from "../../types/feedback";
import type { QuestionResult } from "../../admin/adminEventTypes";
import {
  applyOptionVoteCountOverrides,
  contrastingTextOnColor,
  debateDefaultOptionColor,
  resolveDebateSeriesResultTitle,
  sumDebateSeriesOptionStats,
  withDebateOptionColors,
} from "@meyouquize/shared";

/** Шапка блока серии: заголовок открывает настройки, шестерёнка сворачивает раунды. */
function DebateSeriesHeader(props: {
  roundsCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  manageMode?: boolean;
  adminDoneMode?: "markDone" | "markActive";
  adminDoneDisabled?: boolean;
  onToggleAdminDone?: () => void;
  onBlockDragStart?: () => void;
  onBlockDragEnd?: () => void;
}) {
  const {
    roundsCount,
    expanded,
    onToggleExpanded,
    onEdit,
    manageMode = false,
    adminDoneMode,
    adminDoneDisabled = false,
    onToggleAdminDone,
    onBlockDragStart,
    onBlockDragEnd,
  } = props;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: expanded ? "1px solid" : "none",
        borderColor: "divider",
      }}
    >
      {manageMode && adminDoneMode && onToggleAdminDone ? (
        <Tooltip
          title={
            adminDoneDisabled
              ? "Сначала сохраните все раунды серии"
              : adminDoneMode === "markActive"
                ? "Вернуть в актуальные"
                : "В отработанные"
          }
        >
          <span>
            <IconButton
              size="small"
              disabled={adminDoneDisabled}
              onClick={(event) => {
                event.stopPropagation();
                onToggleAdminDone();
              }}
              aria-label={
                adminDoneMode === "markActive" ? "Вернуть в актуальные" : "В отработанные"
              }
              sx={{ flexShrink: 0, p: 0.25 }}
            >
              {adminDoneMode === "markActive" ? (
                <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
              ) : (
                <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      {manageMode ? (
        <Tooltip title="Перетащите для изменения порядка">
          <Box
            component="span"
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              onBlockDragStart?.();
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", "debate-series");
            }}
            onDragEnd={() => onBlockDragEnd?.()}
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
      <Box
        component="button"
        type="button"
        onClick={onEdit}
        aria-label="Редактировать дебаты"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "none",
          p: 0,
          m: 0,
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          borderRadius: 1,
          "&:hover .debate-series-title": { textDecoration: "underline" },
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            lineHeight: 0,
          }}
        >
          <ForumIcon sx={{ fontSize: 18, display: "block" }} color="action" />
        </Box>
        <Typography
          className="debate-series-title"
          variant="subtitle2"
          sx={{ fontWeight: 400, minWidth: 0 }}
          noWrap
        >
          Дебаты · {roundsCount} {roundsCount === 1 ? "раунд" : "раунда"}
        </Typography>
      </Box>
      <Tooltip title={expanded ? "Свернуть раунды" : "Развернуть раунды"}>
        <IconButton
          size="small"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Свернуть раунды серии" : "Развернуть раунды серии"}
          color={expanded ? "primary" : "default"}
        >
          {expanded ? <SettingsIcon fontSize="small" /> : <SettingsOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function DebateSeriesEditDialog(props: {
  open: boolean;
  roundsCount: number;
  resultTitle: string;
  onClose: () => void;
  onSave: (resultTitle: string) => void;
}) {
  const { open, roundsCount, resultTitle, onClose, onSave } = props;
  const [draftTitle, setDraftTitle] = useState(resultTitle);
  useEffect(() => {
    if (open) setDraftTitle(resultTitle);
  }, [open, resultTitle]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Дебаты</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Серия · {roundsCount} {roundsCount === 1 ? "раунд" : "раунда"}
          </Typography>
          <TextField
            label="Текст финального результата на проекторе"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Накопительный итог"
            fullWidth
            inputProps={{ maxLength: 200 }}
            helperText="Показывается при выводе накопительного итога серии на экран"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSave(draftTitle.trim());
            onClose();
          }}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DebateSeriesCumulativePreview(props: {
  seriesId: string;
  formIndices: number[];
  questionForms: QuestionForm[];
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  debateSeriesShowRounds: boolean;
  setMessage: (message: string) => void;
  setPublicResultsView: AdminSetPublicResultsView;
}) {
  const {
    seriesId,
    formIndices,
    questionForms,
    questionResults,
    publicViewMode,
    publicViewQuestionId,
    debateSeriesShowRounds,
    setMessage,
    setPublicResultsView,
  } = props;
  const rounds = formIndices
    .map((i) => ({ index: i, q: questionForms[i] }))
    .filter((row): row is { index: number; q: QuestionForm } => Boolean(row.q))
    .sort((a, b) => (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index);
  if (rounds.length === 0) return null;

  const seed = rounds[rounds.length - 1];
  const canShow = Boolean(seed?.q.id);
  const onProjector =
    publicViewMode === "debate_series" &&
    Boolean(seriesId) &&
    rounds.some(({ q }) => q.id === publicViewQuestionId && q.debateSeriesId?.trim() === seriesId);

  const resultById = new Map(questionResults.map((row) => [row.questionId, row]));
  const summed = sumDebateSeriesOptionStats(
    rounds.map(({ q }) => {
      const colored = withDebateOptionColors(q.options ?? []);
      const live = q.id ? resultById.get(q.id) : undefined;
      const rows = colored.map((opt, slot) => {
        const liveRow =
          (opt.id ? live?.optionStats.find((s) => s.optionId === opt.id) : undefined) ??
          live?.optionStats[slot];
        return {
          optionId: opt.id ?? `slot-${slot}`,
          text: opt.text.trim() || `Вариант ${slot + 1}`,
          count: liveRow?.count ?? 0,
          color: opt.color ?? debateDefaultOptionColor(slot),
          isCorrect: Boolean(opt.isCorrect),
        };
      });
      return applyOptionVoteCountOverrides(rows, q.optionVoteCountOverrides ?? []);
    }),
  );
  const total = summed.reduce((acc, row) => acc + Math.max(0, row.count), 0);
  if (summed.length === 0) return null;

  const storedTitle = resolveDebateSeriesResultTitle(
    rounds.map(({ q }) => q.debateSeriesResultTitle).find((t) => t?.trim()) ??
      rounds[0]?.q.debateSeriesResultTitle,
  );

  const projectorTitle = onProjector
    ? "Скрыть накопительный итог с экрана"
    : "Показать накопительный итог на экране";

  return (
    <Stack spacing={0.75} sx={{ width: "100%" }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flex: 1 }}>
          {storedTitle}
          {total <= 0 ? " — пока нет голосов" : ""}
        </Typography>
        <Tooltip title={projectorTitle}>
          <span>
            <IconButton
              size="small"
              color={onProjector ? "success" : "default"}
              disabled={!canShow}
              aria-pressed={onProjector}
              aria-label={projectorTitle}
              onClick={() => {
                if (!seed?.q.id) {
                  setMessage("Сначала сохраните раунды");
                  return;
                }
                if (onProjector) {
                  setPublicResultsView("title");
                  return;
                }
                setPublicResultsView("debate_series", seed.q.id, {
                  debateSeriesId: seriesId,
                  debateSeriesView: "cumulative",
                  debateSeriesQuestionIds: rounds
                    .map(({ q }) => q.id)
                    .filter((id): id is string => Boolean(id)),
                  debateSeriesShowRounds,
                });
              }}
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: 36,
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: onProjector ? "action.selected" : "action.hover",
        }}
      >
        {summed.map((row, index) => {
          const percent = total > 0 ? (Math.max(0, row.count) / total) * 100 : 0;
          const displayPercent =
            total > 0 ? Math.max(percent, percent > 0 ? 8 : 6) : 100 / summed.length;
          const color = row.color ?? debateDefaultOptionColor(index);
          const label =
            total > 0
              ? `${String(Math.round(percent * 10) / 10).replace(/\.0$/, "")}% / ${row.count}`
              : `— / 0`;
          return (
            <Box
              key={row.optionId}
              sx={{
                flexGrow: displayPercent,
                flexBasis: 0,
                minWidth: 0,
                bgcolor: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 0.5,
                gap: 0.5,
              }}
              title={`${row.text}: ${row.count} (${label})`}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: contrastingTextOnColor(color),
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  lineHeight: 1.1,
                }}
              >
                {row.text}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: contrastingTextOnColor(color),
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  lineHeight: 1.1,
                  opacity: 0.92,
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}

function DebateSeriesFooter(props: {
  seriesId: string;
  formIndices: number[];
  questionForms: QuestionForm[];
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  playerResultsVisible: boolean;
  onTogglePlayerResults: () => void;
  debateSeriesShowRounds: boolean;
  onToggleDebateSeriesShowRounds: () => void;
  setMessage: (message: string) => void;
  setPublicResultsView: AdminSetPublicResultsView;
  onAddRound: (globalIndex: number) => void;
}) {
  const {
    seriesId,
    formIndices,
    questionForms,
    questionResults,
    publicViewMode,
    publicViewQuestionId,
    playerResultsVisible,
    onTogglePlayerResults,
    debateSeriesShowRounds,
    onToggleDebateSeriesShowRounds,
    setMessage,
    setPublicResultsView,
    onAddRound,
  } = props;
  const lastIndex = formIndices[formIndices.length - 1];
  const seed =
    lastIndex != null
      ? formIndices
          .map((i) => ({ index: i, q: questionForms[i] }))
          .filter((row): row is { index: number; q: QuestionForm } => Boolean(row.q))
          .sort(
            (a, b) =>
              (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index,
          )
          .at(-1)
      : undefined;
  const seedIndex = seed?.index ?? lastIndex;
  const canShowPlayerResults = Boolean(seed?.q.id);
  const playerTitle = playerResultsVisible
    ? "Скрыть результаты в интерфейсе пользователя"
    : "Показать результаты в интерфейсе пользователя";
  const roundsOnScreenTitle = debateSeriesShowRounds
    ? "Скрыть результаты раундов на экране"
    : "Показать результаты раундов на экране";

  return (
    <Stack spacing={1.25} sx={{ px: 1.5, pb: 1.5, pt: 1 }}>
      <DebateSeriesCumulativePreview
        seriesId={seriesId}
        formIndices={formIndices}
        questionForms={questionForms}
        questionResults={questionResults}
        publicViewMode={publicViewMode}
        publicViewQuestionId={publicViewQuestionId}
        debateSeriesShowRounds={debateSeriesShowRounds}
        setMessage={setMessage}
        setPublicResultsView={setPublicResultsView}
      />
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: "100%" }}>
        <Button
          startIcon={<AddIcon />}
          size="small"
          variant="outlined"
          disabled={seedIndex == null || !questionForms[seedIndex!]?.id}
          onClick={() => {
            if (seedIndex == null) return;
            onAddRound(seedIndex);
          }}
        >
          Добавить раунд
        </Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={roundsOnScreenTitle}>
          <span>
            <IconButton
              size="small"
              color={debateSeriesShowRounds ? "secondary" : "default"}
              aria-pressed={debateSeriesShowRounds}
              aria-label={roundsOnScreenTitle}
              onClick={onToggleDebateSeriesShowRounds}
              sx={
                debateSeriesShowRounds
                  ? {
                      color: "success.main",
                    }
                  : undefined
              }
            >
              {debateSeriesShowRounds ? (
                <ViewStreamIcon fontSize="small" />
              ) : (
                <ViewStreamOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={playerTitle}>
          <span>
            <IconButton
              size="small"
              color={playerResultsVisible ? "secondary" : "default"}
              disabled={!canShowPlayerResults}
              aria-pressed={playerResultsVisible}
              aria-label={playerTitle}
              onClick={() => {
                if (!canShowPlayerResults) {
                  setMessage("Сначала сохраните раунды");
                  return;
                }
                onTogglePlayerResults();
              }}
              sx={
                playerResultsVisible
                  ? {
                      color: "success.main",
                    }
                  : undefined
              }
            >
              <PieChartIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function DebateSeriesBlockShell(props: {
  seriesId: string;
  formIndices: number[];
  questionForms: QuestionForm[];
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
  playerResultsVisible: boolean;
  onTogglePlayerResults: () => void;
  debateSeriesShowRounds: boolean;
  onToggleDebateSeriesShowRounds: () => void;
  setMessage: (message: string) => void;
  setPublicResultsView: AdminSetPublicResultsView;
  onAddRound: (globalIndex: number) => void;
  onResultTitleChange: (seriesId: string, title: string) => void;
  paperSx?: object;
  manageMode?: boolean;
  adminDoneMode?: "markDone" | "markActive";
  onToggleAdminDone?: () => void;
  onBlockDragStart?: () => void;
  onBlockDragEnd?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent) => void;
  children: ReactNode;
}) {
  const {
    seriesId,
    formIndices,
    questionForms,
    questionResults,
    publicViewMode,
    publicViewQuestionId,
    playerResultsVisible,
    onTogglePlayerResults,
    debateSeriesShowRounds,
    onToggleDebateSeriesShowRounds,
    setMessage,
    setPublicResultsView,
    onAddRound,
    onResultTitleChange,
    paperSx,
    manageMode = false,
    adminDoneMode,
    onToggleAdminDone,
    onBlockDragStart,
    onBlockDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    children,
  } = props;
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const roundsCount = formIndices.filter((i) => questionForms[i]).length;
  const adminDoneDisabled = formIndices.some((i) => !questionForms[i]?.id);
  const resultTitle = resolveDebateSeriesResultTitle(
    formIndices.map((i) => questionForms[i]?.debateSeriesResultTitle).find((t) => t?.trim()) ??
      null,
  );

  return (
    <Paper
      variant="outlined"
      sx={paperSx}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <DebateSeriesHeader
        roundsCount={roundsCount}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
        onEdit={() => setEditOpen(true)}
        manageMode={manageMode}
        adminDoneMode={adminDoneMode}
        adminDoneDisabled={adminDoneDisabled}
        onToggleAdminDone={onToggleAdminDone}
        onBlockDragStart={onBlockDragStart}
        onBlockDragEnd={onBlockDragEnd}
      />
      <DebateSeriesEditDialog
        open={editOpen}
        roundsCount={roundsCount}
        resultTitle={resultTitle}
        onClose={() => setEditOpen(false)}
        onSave={(title) => onResultTitleChange(seriesId, title)}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit={false}>
        {children}
        <DebateSeriesFooter
          seriesId={seriesId}
          formIndices={formIndices}
          questionForms={questionForms}
          questionResults={questionResults}
          publicViewMode={publicViewMode}
          publicViewQuestionId={publicViewQuestionId}
          playerResultsVisible={playerResultsVisible}
          onTogglePlayerResults={onTogglePlayerResults}
          debateSeriesShowRounds={debateSeriesShowRounds}
          onToggleDebateSeriesShowRounds={onToggleDebateSeriesShowRounds}
          setMessage={setMessage}
          setPublicResultsView={setPublicResultsView}
          onAddRound={onAddRound}
        />
      </Collapse>
    </Paper>
  );
}

export type AdminEventQuestionsTabProps = {
  roomQuestionsTab: RoomQuestionsTab;
  onRoomQuestionsTabChange: (
    value: "quizzes" | "votes" | "reactions" | "feedback" | "randomizer",
  ) => void;
  eventName: string;
  quizId: string;
  onlineUsersCount: number;
  eventParticipantNicknames: string[];
  refreshEventParticipantNicknames: () => Promise<string[]>;
  feedbackForms: FeedbackFormConfig[];
  setFeedbackForms: Dispatch<SetStateAction<FeedbackFormConfig[]>>;
  syncFeedbackCatalogToReport: (forms: FeedbackFormConfig[]) => void;
  feedbackCatalogLoading: boolean;
  subQuizSheets: SubQuizSheet[];
  setSubQuizSheets: Dispatch<SetStateAction<SubQuizSheet[]>>;
  questionForms: QuestionForm[];
  selectedQuestionIndex: number;
  expandedSubQuizId: string | false;
  setExpandedSubQuizId: Dispatch<SetStateAction<string | false>>;
  votesIndexMap: number[];
  activeVoteIndices: number[];
  doneVoteIndices: number[];
  activeVotesSelectedListIndex: number;
  doneVotesSelectedListIndex: number;
  voteListManageMode: boolean;
  setVoteListManageMode: Dispatch<SetStateAction<boolean>>;
  publicViewMode: PublicViewMode;
  resultsSubQuizId: string;
  firstCorrectWinnersCount: number;
  setFirstCorrectWinnersCount: Dispatch<SetStateAction<number>>;
  highlightedLeadersCount: number;
  setHighlightedLeadersCount: Dispatch<SetStateAction<number>>;
  questionsSectionBindings: AdminQuestionsSectionSharedBindings;
  playerTiles: ReturnType<typeof useAdminPlayerTiles>;
  randomizer: ReturnType<typeof useAdminRandomizer>;
  adminReactions: ReturnType<typeof useAdminReactions>;
  emitPublicViewPatch: (patch: PublicViewSetPatch) => void;
  setPublicResultsView: AdminSetPublicResultsView;
  addSubQuizSheet: () => void;
  addQuestionToSubQuiz: (subQuizId: string | null) => void;
  saveSubQuizTitle: (
    subQuizId: string,
    title: string,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => void | Promise<void>;
  requestRemoveSubQuizSheet: (subQuizId: string) => void;
  toggleQuestion: (questionIndex: number, enabled: boolean) => void;
  updateFirstCorrectWinnersCount: (raw: number) => void;
  updateHighlightedLeaders: (nextValue: number) => void;
  confirmResetSubQuizAnswersById: (subQuizId: string, title: string) => void;
  toggleQuestionAdminDone: (globalIndex: number) => void | Promise<void>;
  setQuestionsAdminDone: (globalIndices: number[], adminDone: boolean) => void | Promise<void>;
  reorderVoteInList: (
    fromLocal: number,
    toLocal: number,
    indexMap: number[],
  ) => void | Promise<void>;
  reorderVoteDisplayBlocks: (
    fromBlockIndex: number,
    toBlockIndex: number,
    scopeIndices: number[],
  ) => void | Promise<void>;
  cloneQuestionAtIndex: (globalIndex: number) => void | Promise<void>;
  addDebateSeriesRoundAtIndex: (globalIndex: number) => void | Promise<void>;
  updateDebateSeriesResultTitle: (seriesId: string, title: string) => void | Promise<void>;
  debateSeriesShowRounds: boolean;
  onToggleDebateSeriesShowRounds: () => void;
};

export function AdminEventQuestionsTab({
  roomQuestionsTab,
  onRoomQuestionsTabChange,
  eventName,
  quizId,
  onlineUsersCount,
  eventParticipantNicknames,
  refreshEventParticipantNicknames,
  feedbackForms,
  setFeedbackForms,
  syncFeedbackCatalogToReport,
  feedbackCatalogLoading,
  subQuizSheets,
  setSubQuizSheets,
  questionForms,
  selectedQuestionIndex,
  expandedSubQuizId,
  setExpandedSubQuizId,
  votesIndexMap,
  activeVoteIndices,
  doneVoteIndices,
  activeVotesSelectedListIndex,
  doneVotesSelectedListIndex,
  voteListManageMode,
  setVoteListManageMode,
  publicViewMode,
  resultsSubQuizId,
  firstCorrectWinnersCount,
  setFirstCorrectWinnersCount,
  highlightedLeadersCount,
  setHighlightedLeadersCount,
  questionsSectionBindings,
  playerTiles,
  randomizer,
  adminReactions,
  emitPublicViewPatch,
  setPublicResultsView,
  addSubQuizSheet,
  addQuestionToSubQuiz,
  saveSubQuizTitle,
  requestRemoveSubQuizSheet,
  toggleQuestion,
  updateFirstCorrectWinnersCount,
  updateHighlightedLeaders,
  confirmResetSubQuizAnswersById,
  toggleQuestionAdminDone,
  setQuestionsAdminDone,
  reorderVoteInList,
  reorderVoteDisplayBlocks,
  cloneQuestionAtIndex,
  addDebateSeriesRoundAtIndex,
  updateDebateSeriesResultTitle,
  debateSeriesShowRounds,
  onToggleDebateSeriesShowRounds,
}: AdminEventQuestionsTabProps) {
  const [votesBlockDragIndex, setVotesBlockDragIndex] = useState<number | null>(null);
  const [votesBlockDropIndex, setVotesBlockDropIndex] = useState<number | null>(null);
  const importParticipantsToFreeList = useCallback(
    (nicknames: string[]) => {
      if (nicknames.length === 0) return;
      const text = nicknames.join("\n");
      randomizer.markNamesEdited();
      randomizer.setNamesText(text);
      emitPublicViewPatch({ randomizerNamesText: text });
    },
    [emitPublicViewPatch, randomizer],
  );

  const refreshParticipantsFromRoom = useCallback(
    async (options?: { forceImportFreeList?: boolean }) => {
      const nicknames = await refreshEventParticipantNicknames();
      if (
        nicknames.length > 0 &&
        randomizer.listMode === "free_list" &&
        options?.forceImportFreeList
      ) {
        importParticipantsToFreeList(nicknames);
      }
      return nicknames;
    },
    [importParticipantsToFreeList, randomizer.listMode, refreshEventParticipantNicknames],
  );

  useEffect(() => {
    if (roomQuestionsTab !== "randomizer") return;
    void (async () => {
      const nicknames = await refreshEventParticipantNicknames();
      if (randomizer.listMode !== "free_list") return;
      if (randomizer.namesEditedRef.current) return;
      const saved = parseNames(randomizer.namesText);
      if (!isStaleParticipantSnapshot(saved, nicknames)) return;
      importParticipantsToFreeList(nicknames);
    })();
  }, [
    roomQuestionsTab,
    refreshEventParticipantNicknames,
    randomizer.listMode,
    randomizer.namesText,
    randomizer.namesEditedRef,
    importParticipantsToFreeList,
  ]);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Paper
        variant="outlined"
        elevation={0}
        sx={{
          p: 1.25,
          pt: 0,
          bgcolor: "background.paper",
          borderColor: "divider",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <Tabs
          value={roomQuestionsTab}
          onChange={(_, v: "quizzes" | "votes" | "reactions" | "feedback" | "randomizer") =>
            onRoomQuestionsTabChange(v)
          }
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: "divider", px: 0.5 }}
        >
          <Tab label="Голосования" value="votes" />
          <Tab label="Квизы" value="quizzes" />
          <Tab label="ОС" value="feedback" />
          <Tab label="Рандом" value="randomizer" />
          <Tab label="Реакции" value="reactions" />
        </Tabs>
        <Box sx={{ pt: 2, px: 0.25 }}>
          {roomQuestionsTab === "quizzes" &&
            (subQuizSheets.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                  py: 6,
                  px: 2,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                  onClick={addSubQuizSheet}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: "1.1rem",
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  Создать квиз
                </Button>
              </Box>
            ) : (
              <Stack sx={{ alignItems: "stretch" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0,
                    width: "100%",
                  }}
                >
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={addSubQuizSheet}
                  >
                    квиз
                  </Button>
                </Box>
                <Stack spacing={3} sx={{ width: "100%", mt: 1.5 }}>
                  {subQuizSheets.map((sq) => {
                    const quizIndexMap = buildQuestionIndexMapForSubQuiz(questionForms, sq.id);
                    const quizQuestions = quizIndexMap.map((i) => questionForms[i]).filter(Boolean);
                    const qSel = quizIndexMap.indexOf(selectedQuestionIndex);
                    const quizHasQuestions = quizIndexMap.length > 0;
                    const activeLocalIndex = quizQuestions.findIndex((q) => Boolean(q?.isActive));
                    const playerQuizReportActiveForThisSubQuiz =
                      playerTiles.playerQuizResultsSubQuizIds.includes(sq.id);
                    return (
                      <Accordion
                        key={sq.id}
                        disableGutters
                        expanded={expandedSubQuizId === sq.id}
                        onChange={(_, expanded) => setExpandedSubQuizId(expanded ? sq.id : false)}
                      >
                        <AccordionSummary
                          component="div"
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            pt: 2.5,
                            pb: 2,
                            "& .MuiAccordionSummary-content": {
                              alignItems: "center",
                              gap: 1,
                              flexGrow: 1,
                              marginTop: 0,
                              marginBottom: 0,
                              minWidth: 0,
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            <TextField
                              size="small"
                              label="Название квиза"
                              value={sq.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setSubQuizSheets((prev) =>
                                  prev.map((s) => (s.id === sq.id ? { ...s, title } : s)),
                                );
                              }}
                              onBlur={() => {
                                void saveSubQuizTitle(
                                  sq.id,
                                  sq.title,
                                  subQuizSheets,
                                  questionForms,
                                  quizId,
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              sx={{ flex: 1, maxWidth: 480, minWidth: 0 }}
                            />
                            <Tooltip title="Удалить квиз" enterTouchDelay={400}>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Удалить квиз"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.info("[admin][subquiz-delete] click", {
                                    subQuizId: sq.id,
                                  });
                                  requestRemoveSubQuizSheet(sq.id);
                                }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, px: 0, pb: 2 }}>
                          {quizHasQuestions ? (
                            <Stack spacing={1.25}>
                              <AdminQuestionsSection
                                {...questionsSectionBindings}
                                listTitle="Вопросы квиза"
                                listHeaderPrimaryAction={{
                                  label: "Статистика",
                                  to: `/admin/${eventName}/sub-quizzes/${sq.id}/results`,
                                }}
                                addButtonLabel="Вопрос"
                                questionForms={quizIndexMap.map((i) => questionForms[i])}
                                selectedListIndex={qSel < 0 ? 0 : qSel}
                                remapQuestionIndex={(local) => quizIndexMap[local] ?? 0}
                                addQuestion={() => addQuestionToSubQuiz(sq.id)}
                              />
                              <SubQuizControlsCard
                                activeLocalIndex={activeLocalIndex}
                                quizIndexMap={quizIndexMap}
                                quizId={quizId}
                                questionFlowMode={sq.questionFlowMode ?? "manual"}
                                onChangeQuestionFlowMode={(mode) =>
                                  setSubQuizSheets((prev) => {
                                    const current = prev.find((item) => item.id === sq.id);
                                    const next = prev.map((item) =>
                                      item.id === sq.id
                                        ? { ...item, questionFlowMode: mode }
                                        : item,
                                    );
                                    if (
                                      current?.questionFlowMode === "auto" &&
                                      mode === "manual" &&
                                      quizId
                                    ) {
                                      socket.emit("sub-quiz:close", {
                                        quizId,
                                        subQuizId: sq.id,
                                      });
                                    }
                                    return next;
                                  })
                                }
                                onStartAuto={() => {
                                  if (!quizId) return;
                                  socket.emit("sub-quiz:start-auto", {
                                    quizId,
                                    subQuizId: sq.id,
                                  });
                                }}
                                isLeaderboardShown={
                                  publicViewMode === "leaderboard" && resultsSubQuizId === sq.id
                                }
                                firstCorrectWinnersCount={firstCorrectWinnersCount}
                                highlightedLeadersCount={highlightedLeadersCount}
                                onPrev={() => {
                                  if (activeLocalIndex <= 0) return;
                                  const prevGlobalIndex = quizIndexMap[activeLocalIndex - 1];
                                  if (prevGlobalIndex == null) return;
                                  toggleQuestion(prevGlobalIndex, true);
                                }}
                                onNext={() => {
                                  if (activeLocalIndex < 0) {
                                    const firstGlobalIndex = quizIndexMap[0];
                                    if (firstGlobalIndex == null) return;
                                    toggleQuestion(firstGlobalIndex, true);
                                    return;
                                  }
                                  const nextGlobalIndex = quizIndexMap[activeLocalIndex + 1];
                                  if (nextGlobalIndex == null) {
                                    if (!quizId) return;
                                    socket.emit("sub-quiz:close", {
                                      quizId,
                                      subQuizId: sq.id,
                                    });
                                    return;
                                  }
                                  toggleQuestion(nextGlobalIndex, true);
                                }}
                                onFinish={() => {
                                  if (!quizId) return;
                                  socket.emit("sub-quiz:close", {
                                    quizId,
                                    subQuizId: sq.id,
                                  });
                                }}
                                onToggleResults={() => {
                                  if (
                                    publicViewMode === "leaderboard" &&
                                    resultsSubQuizId === sq.id
                                  ) {
                                    setPublicResultsView("title");
                                    return;
                                  }
                                  setPublicResultsView("leaderboard", undefined, {
                                    leaderboardSubQuizId: sq.id,
                                  });
                                }}
                                onChangeLeadersTop={(next) =>
                                  setFirstCorrectWinnersCount(Math.max(1, Math.min(20, next)))
                                }
                                onCommitLeadersTop={updateFirstCorrectWinnersCount}
                                onChangeResultsUsers={(next) => setHighlightedLeadersCount(next)}
                                onCommitResultsUsers={updateHighlightedLeaders}
                                playerQuizReportActive={playerQuizReportActiveForThisSubQuiz}
                                onTogglePlayerQuizReport={() => {
                                  if (!quizId) return;
                                  const active = playerTiles.playerQuizResultsSubQuizIds.includes(
                                    sq.id,
                                  );
                                  playerTiles.togglePlayerQuizReportForSubQuiz(
                                    sq.id,
                                    !active,
                                    sq.title.trim() || playerTiles.playerQuizResultsTileText,
                                  );
                                }}
                                onRequestResetAnswers={() =>
                                  confirmResetSubQuizAnswersById(sq.id, sq.title.trim() || "Квиз")
                                }
                              />
                            </Stack>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 200,
                                py: 4,
                                px: 2,
                              }}
                            >
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                                onClick={() => addQuestionToSubQuiz(sq.id)}
                                sx={{
                                  py: 2,
                                  px: 4,
                                  fontSize: "1.1rem",
                                  borderRadius: 2,
                                  boxShadow: 2,
                                  textTransform: "none",
                                }}
                              >
                                Вопрос
                              </Button>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
          {roomQuestionsTab === "votes" &&
            (votesIndexMap.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                  py: 6,
                  px: 2,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<HowToVoteIcon sx={{ fontSize: 28 }} />}
                  onClick={() => addQuestionToSubQuiz(null)}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: "1.1rem",
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  Создать голосование
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0,
                    width: "100%",
                  }}
                >
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => addQuestionToSubQuiz(null)}
                  >
                    Голосование
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {activeVoteIndices.length > 0 ? (
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ px: 0.5 }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Актуальные ({activeVoteIndices.length})
                        </Typography>
                        <Tooltip
                          title={
                            voteListManageMode ? "Скрыть управление списком" : "Управление списком"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => setVoteListManageMode((current) => !current)}
                            aria-label="Управление списком голосований"
                            aria-pressed={voteListManageMode}
                            color={voteListManageMode ? "primary" : "default"}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      {filterVotesDisplayBlocks(
                        buildVotesDisplayBlocks(questionForms),
                        new Set(activeVoteIndices),
                      ).map((block, blockIndex) => {
                        const indices =
                          block.kind === "debate_series" ? block.formIndices : [block.formIndex];
                        const selectedLocal = indices.indexOf(
                          activeVoteIndices[activeVotesSelectedListIndex] ?? -1,
                        );
                        const isDropTarget =
                          voteListManageMode &&
                          votesBlockDropIndex === blockIndex &&
                          votesBlockDragIndex != null &&
                          votesBlockDragIndex !== blockIndex;
                        const blockDropSx = {
                          outline: isDropTarget ? "2px solid" : undefined,
                          outlineColor: isDropTarget ? "primary.main" : undefined,
                          opacity:
                            voteListManageMode && votesBlockDragIndex === blockIndex ? 0.55 : 1,
                        } as const;
                        const blockDragHandlers = voteListManageMode
                          ? {
                              onDragOver: (event: DragEvent) => {
                                if (votesBlockDragIndex === null) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setVotesBlockDropIndex(blockIndex);
                              },
                              onDragLeave: () => {
                                setVotesBlockDropIndex((current) =>
                                  current === blockIndex ? null : current,
                                );
                              },
                              onDrop: (event: DragEvent) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (
                                  votesBlockDragIndex != null &&
                                  votesBlockDragIndex !== blockIndex
                                ) {
                                  void reorderVoteDisplayBlocks(
                                    votesBlockDragIndex,
                                    blockIndex,
                                    activeVoteIndices,
                                  );
                                }
                                setVotesBlockDragIndex(null);
                                setVotesBlockDropIndex(null);
                              },
                            }
                          : {};
                        return block.kind === "debate_series" ? (
                          <DebateSeriesBlockShell
                            key={`series-${block.seriesId}`}
                            seriesId={block.seriesId}
                            formIndices={indices}
                            questionForms={questionForms}
                            questionResults={questionsSectionBindings.questionResults}
                            publicViewMode={publicViewMode}
                            publicViewQuestionId={questionsSectionBindings.publicViewQuestionId}
                            playerResultsVisible={questionsSectionBindings.playerVisibleDebateSeriesIds.includes(
                              block.seriesId,
                            )}
                            onTogglePlayerResults={() =>
                              questionsSectionBindings.togglePlayerVisibleDebateSeriesId(
                                block.seriesId,
                              )
                            }
                            debateSeriesShowRounds={debateSeriesShowRounds}
                            onToggleDebateSeriesShowRounds={onToggleDebateSeriesShowRounds}
                            setMessage={questionsSectionBindings.setMessage}
                            setPublicResultsView={setPublicResultsView}
                            onAddRound={(g) => void addDebateSeriesRoundAtIndex(g)}
                            onResultTitleChange={(id, title) =>
                              void updateDebateSeriesResultTitle(id, title)
                            }
                            manageMode={voteListManageMode}
                            adminDoneMode="markDone"
                            onToggleAdminDone={() => void setQuestionsAdminDone(indices, true)}
                            onBlockDragStart={() => {
                              setVotesBlockDragIndex(blockIndex);
                              setVotesBlockDropIndex(null);
                            }}
                            onBlockDragEnd={() => {
                              setVotesBlockDragIndex(null);
                              setVotesBlockDropIndex(null);
                            }}
                            onDragOver={blockDragHandlers.onDragOver}
                            onDragLeave={blockDragHandlers.onDragLeave}
                            onDrop={blockDragHandlers.onDrop}
                            paperSx={{
                              bgcolor: "background.paper",
                              ...blockDropSx,
                            }}
                          >
                            <AdminQuestionsSection
                              {...questionsSectionBindings}
                              listTitle=""
                              addButtonLabel="Добавить голосование"
                              listHeaderShowAddButton={false}
                              questionForms={indices.map((i) => questionForms[i]!)}
                              selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                              remapQuestionIndex={(local) => indices[local] ?? 0}
                              voteListManageMode={voteListManageMode}
                              onReorderVoteInList={(fromLocal, toLocal) =>
                                void reorderVoteInList(fromLocal, toLocal, indices)
                              }
                              addQuestion={() => addQuestionToSubQuiz(null)}
                              onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                            />
                          </DebateSeriesBlockShell>
                        ) : (
                          <Paper
                            key={`single-${block.formIndex}`}
                            variant="outlined"
                            sx={{
                              borderColor: "divider",
                              bgcolor: "background.paper",
                              ...blockDropSx,
                            }}
                            onDragOver={blockDragHandlers.onDragOver}
                            onDragLeave={blockDragHandlers.onDragLeave}
                            onDrop={blockDragHandlers.onDrop}
                          >
                            <AdminQuestionsSection
                              {...questionsSectionBindings}
                              listTitle=""
                              addButtonLabel="Добавить голосование"
                              listHeaderShowAddButton={false}
                              questionForms={indices.map((i) => questionForms[i]!)}
                              selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                              remapQuestionIndex={(local) => indices[local] ?? 0}
                              adminDoneToggle={{
                                mode: "markDone",
                                onToggle: toggleQuestionAdminDone,
                              }}
                              voteListManageMode={voteListManageMode}
                              onReorderVoteInList={(fromLocal, toLocal) =>
                                void reorderVoteInList(fromLocal, toLocal, indices)
                              }
                              addQuestion={() => addQuestionToSubQuiz(null)}
                              onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                            />
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                      Нет актуальных голосований
                    </Typography>
                  )}
                  {doneVoteIndices.length > 0 ? (
                    <Accordion
                      defaultExpanded={false}
                      disableGutters
                      elevation={0}
                      sx={{
                        bgcolor: "transparent",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Отработанные ({doneVoteIndices.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <Stack spacing={1.5}>
                          {filterVotesDisplayBlocks(
                            buildVotesDisplayBlocks(questionForms),
                            new Set(doneVoteIndices),
                          ).map((block) => {
                            const indices =
                              block.kind === "debate_series"
                                ? block.formIndices
                                : [block.formIndex];
                            const selectedLocal = indices.indexOf(
                              doneVoteIndices[doneVotesSelectedListIndex] ?? -1,
                            );
                            return block.kind === "debate_series" ? (
                              <DebateSeriesBlockShell
                                key={`done-series-${block.seriesId}`}
                                seriesId={block.seriesId}
                                formIndices={indices}
                                questionForms={questionForms}
                                questionResults={questionsSectionBindings.questionResults}
                                publicViewMode={publicViewMode}
                                publicViewQuestionId={questionsSectionBindings.publicViewQuestionId}
                                playerResultsVisible={questionsSectionBindings.playerVisibleDebateSeriesIds.includes(
                                  block.seriesId,
                                )}
                                onTogglePlayerResults={() =>
                                  questionsSectionBindings.togglePlayerVisibleDebateSeriesId(
                                    block.seriesId,
                                  )
                                }
                                debateSeriesShowRounds={debateSeriesShowRounds}
                                onToggleDebateSeriesShowRounds={onToggleDebateSeriesShowRounds}
                                setMessage={questionsSectionBindings.setMessage}
                                setPublicResultsView={setPublicResultsView}
                                onAddRound={(g) => void addDebateSeriesRoundAtIndex(g)}
                                onResultTitleChange={(id, title) =>
                                  void updateDebateSeriesResultTitle(id, title)
                                }
                                manageMode={voteListManageMode}
                                adminDoneMode="markActive"
                                onToggleAdminDone={() => void setQuestionsAdminDone(indices, false)}
                                paperSx={{ bgcolor: "background.paper" }}
                              >
                                <AdminQuestionsSection
                                  {...questionsSectionBindings}
                                  listTitle=""
                                  addButtonLabel="Добавить голосование"
                                  listHeaderShowAddButton={false}
                                  questionForms={indices.map((i) => questionForms[i]!)}
                                  selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                                  remapQuestionIndex={(local) => indices[local] ?? 0}
                                  voteListManageMode={voteListManageMode}
                                  onReorderVoteInList={(fromLocal, toLocal) =>
                                    void reorderVoteInList(fromLocal, toLocal, indices)
                                  }
                                  addQuestion={() => addQuestionToSubQuiz(null)}
                                  onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                                />
                              </DebateSeriesBlockShell>
                            ) : (
                              <Paper
                                key={`done-single-${block.formIndex}`}
                                variant="outlined"
                                sx={{ bgcolor: "background.paper" }}
                              >
                                <AdminQuestionsSection
                                  {...questionsSectionBindings}
                                  listTitle=""
                                  addButtonLabel="Добавить голосование"
                                  listHeaderShowAddButton={false}
                                  questionForms={indices.map((i) => questionForms[i]!)}
                                  selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                                  remapQuestionIndex={(local) => indices[local] ?? 0}
                                  adminDoneToggle={{
                                    mode: "markActive",
                                    onToggle: toggleQuestionAdminDone,
                                  }}
                                  voteListManageMode={voteListManageMode}
                                  onReorderVoteInList={(fromLocal, toLocal) =>
                                    void reorderVoteInList(fromLocal, toLocal, indices)
                                  }
                                  addQuestion={() => addQuestionToSubQuiz(null)}
                                  onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                                />
                              </Paper>
                            );
                          })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ) : null}
                </Stack>
              </Stack>
            ))}
          {roomQuestionsTab === "feedback" && quizId ? (
            <AdminFeedbackSection
              eventName={eventName}
              quizId={quizId}
              onlineUsersCount={onlineUsersCount}
              forms={feedbackForms}
              setForms={setFeedbackForms}
              syncCatalogToReport={syncFeedbackCatalogToReport}
              catalogLoading={feedbackCatalogLoading}
            />
          ) : null}
          {roomQuestionsTab === "randomizer" && (
            <AdminRandomizerSection
              mode={randomizer.mode}
              listMode={randomizer.listMode}
              title={randomizer.title}
              namesText={randomizer.namesText}
              participantsNamesText={eventParticipantNicknames.join("\n")}
              liveParticipantCount={eventParticipantNicknames.length}
              onRefreshParticipants={() => {
                void refreshParticipantsFromRoom({ forceImportFreeList: true });
              }}
              onImportParticipantsToFreeList={() => {
                importParticipantsToFreeList(eventParticipantNicknames);
              }}
              minNumber={randomizer.minNumber}
              maxNumber={randomizer.maxNumber}
              winnersCount={randomizer.winnersCount}
              excludeWinners={randomizer.excludeWinners}
              currentWinners={randomizer.currentWinners}
              history={randomizer.history}
              projectorMode={publicViewMode === "randomizer"}
              isRunning={randomizer.isRunning}
              onModeChange={(next) => {
                randomizer.setMode(next);
                emitPublicViewPatch({ randomizerMode: next });
              }}
              onListModeChange={(next) => {
                if (next === "participants_only") {
                  void refreshEventParticipantNicknames();
                }
                randomizer.setListMode(next);
                if (next === "free_list" && eventParticipantNicknames.length > 0) {
                  const text = eventParticipantNicknames.join("\n");
                  randomizer.markNamesEdited();
                  randomizer.setNamesText(text);
                  emitPublicViewPatch({ randomizerListMode: next, randomizerNamesText: text });
                  return;
                }
                emitPublicViewPatch({
                  randomizerListMode: next,
                  randomizerNamesText: randomizerNamesTextForPublicView(
                    next,
                    next === "free_list" ? randomizer.namesText : "",
                  ),
                });
              }}
              onTitleChange={(next) => {
                randomizer.setTitle(next);
              }}
              onTitleCommit={() => {
                emitPublicViewPatch({ randomizerTitle: randomizer.title });
              }}
              onNamesTextChange={(next) => {
                randomizer.markNamesEdited();
                randomizer.setNamesText(next);
                if (randomizer.listMode === "free_list") {
                  emitPublicViewPatch({ randomizerNamesText: next });
                }
              }}
              onMinNumberChange={(next) => {
                randomizer.setMinNumber(Math.trunc(next || 0));
                emitPublicViewPatch({ randomizerMinNumber: Math.trunc(next || 0) });
              }}
              onMaxNumberChange={(next) => {
                randomizer.setMaxNumber(Math.trunc(next || 0));
                emitPublicViewPatch({ randomizerMaxNumber: Math.trunc(next || 0) });
              }}
              onWinnersCountChange={(next) => {
                const clamped = Math.max(1, Math.trunc(next || 1));
                randomizer.setWinnersCount(clamped);
                emitPublicViewPatch({ randomizerWinnersCount: clamped });
              }}
              onExcludeWinnersChange={(next) => {
                randomizer.setExcludeWinners(next);
                emitPublicViewPatch({ randomizerExcludeWinners: next });
              }}
              onRun={randomizer.runRandomizer}
              onReset={randomizer.resetRandomizer}
              onClearScreen={randomizer.clearRandomizerScreenData}
              onToggleProjector={() => {
                if (publicViewMode === "randomizer") {
                  setPublicResultsView("title");
                  return;
                }
                setPublicResultsView("randomizer");
              }}
            />
          )}
          {roomQuestionsTab === "reactions" && (
            <AdminReactionsSection
              widgets={adminReactions.widgets}
              session={adminReactions.reactionSession}
              widgetStatsById={adminReactions.widgetStatsById}
              activeWidgetId={adminReactions.activeWidgetId}
              projectorWidgetId={adminReactions.projectorWidgetId}
              projectorMode={publicViewMode === "reactions"}
              overlayText={adminReactions.overlayText}
              setOverlayText={adminReactions.setOverlayText}
              onCreateWidget={adminReactions.createWidget}
              onUpdateWidget={adminReactions.updateWidget}
              onDeleteWidget={adminReactions.deleteWidget}
              onStartWidget={adminReactions.startWidget}
              onStop={adminReactions.stopWidget}
              onToggleProjector={adminReactions.toggleProjector}
            />
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
