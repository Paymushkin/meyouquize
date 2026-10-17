import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ForumIcon from "@mui/icons-material/Forum";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PieChartIcon from "@mui/icons-material/PieChart";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { DragEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import { CompactColorField } from "../../components/admin/branding/CompactColorField";
import type { AdminSetPublicResultsView } from "../../features/admin/useAdminRandomizer";
import type { PublicViewMode } from "../../publicViewContract";
import {
  applyOptionVoteCountOverrides,
  contrastingTextOnColor,
  debateDefaultOptionColor,
  resolveDebateSeriesResultTitle,
  sanitizeOptionColor,
  sumDebateSeriesOptionStats,
  withDebateOptionColors,
} from "@meyouquize/shared";

/** Шапка блока серии: заголовок открывает настройки, шестерёнка сворачивает раунды. */
function DebateSeriesHeader(props: {
  roundsCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  cumulativeOnProjector: boolean;
  cumulativeCanShow: boolean;
  onToggleCumulativeOnProjector: () => void;
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
    cumulativeOnProjector,
    cumulativeCanShow,
    onToggleCumulativeOnProjector,
    manageMode = false,
    adminDoneMode,
    adminDoneDisabled = false,
    onToggleAdminDone,
    onBlockDragStart,
    onBlockDragEnd,
  } = props;
  const projectorTitle = cumulativeOnProjector
    ? "Скрыть накопительный итог с экрана"
    : "Показать накопительный итог на экране";
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
      <Tooltip title={projectorTitle}>
        <span>
          <IconButton
            size="small"
            color={cumulativeOnProjector ? "success" : "default"}
            disabled={!cumulativeCanShow}
            aria-pressed={cumulativeOnProjector}
            aria-label={projectorTitle}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCumulativeOnProjector();
            }}
          >
            <BarChartIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
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

type DebateSeriesEditOptionDraft = { text: string; color: string };
type DebateSeriesEditRoundDraft = { formIndex: number; roundIndex: number; text: string };

function DebateSeriesEditDialog(props: {
  open: boolean;
  roundsCount: number;
  resultTitle: string;
  options: DebateSeriesEditOptionDraft[];
  rounds: DebateSeriesEditRoundDraft[];
  onClose: () => void;
  onSave: (payload: {
    resultTitle: string;
    options: DebateSeriesEditOptionDraft[];
    rounds: Array<{ formIndex: number; text: string }>;
  }) => void;
  onRemoveSeries: () => void;
  onRemoveRound: (formIndex: number) => void;
}) {
  const {
    open,
    roundsCount,
    resultTitle,
    options,
    rounds,
    onClose,
    onSave,
    onRemoveSeries,
    onRemoveRound,
  } = props;
  const [draftTitle, setDraftTitle] = useState(resultTitle);
  const [draftOptions, setDraftOptions] = useState(options);
  const [draftRounds, setDraftRounds] = useState(rounds);
  const [confirmDeleteSeries, setConfirmDeleteSeries] = useState(false);
  const [confirmDeleteRoundIndex, setConfirmDeleteRoundIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftTitle(resultTitle);
    setDraftOptions(options);
    setDraftRounds(rounds);
    setConfirmDeleteSeries(false);
    setConfirmDeleteRoundIndex(null);
  }, [open, resultTitle, options, rounds]);

  const canRemoveOption = draftOptions.length > 2;

  return (
    <>
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
            <Divider />
            <Typography variant="subtitle2">Варианты (общие для всех раундов)</Typography>
            <Stack spacing={1.25}>
              {draftOptions.map((option, optionIndex) => (
                <Stack
                  key={`debate-opt-${optionIndex}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ width: "100%", minWidth: 0 }}
                >
                  <TextField
                    label={`Вариант ${optionIndex + 1}`}
                    value={option.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      setDraftOptions((prev) =>
                        prev.map((row, i) => (i === optionIndex ? { ...row, text } : row)),
                      );
                    }}
                    size="small"
                    multiline
                    minRows={1}
                    maxRows={4}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <CompactColorField
                    label="Цвет"
                    value={
                      sanitizeOptionColor(option.color, debateDefaultOptionColor(optionIndex)) ??
                      debateDefaultOptionColor(optionIndex)
                    }
                    onChange={(next) => {
                      setDraftOptions((prev) =>
                        prev.map((row, i) => (i === optionIndex ? { ...row, color: next } : row)),
                      );
                    }}
                    onBlur={() => undefined}
                  />
                  <IconButton
                    onClick={() =>
                      setDraftOptions((prev) => prev.filter((_, i) => i !== optionIndex))
                    }
                    disabled={!canRemoveOption}
                    sx={{ flexShrink: 0, mt: 0.5 }}
                    aria-label={`Удалить вариант ${optionIndex + 1}`}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  setDraftOptions((prev) => [
                    ...prev,
                    {
                      text: "",
                      color: debateDefaultOptionColor(prev.length),
                    },
                  ])
                }
                sx={{ alignSelf: "flex-start" }}
              >
                Добавить вариант
              </Button>
            </Stack>
            <Divider />
            <Typography variant="subtitle2">Раунды</Typography>
            <Stack spacing={1.25}>
              {draftRounds.map((round) => (
                <Stack
                  key={`debate-round-${round.formIndex}`}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                >
                  <TextField
                    label={`Раунд ${round.roundIndex + 1}`}
                    value={round.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      setDraftRounds((prev) =>
                        prev.map((row) =>
                          row.formIndex === round.formIndex ? { ...row, text } : row,
                        ),
                      );
                    }}
                    size="small"
                    fullWidth
                    multiline
                    minRows={1}
                    maxRows={4}
                  />
                  <IconButton
                    onClick={() => setConfirmDeleteRoundIndex(round.formIndex)}
                    disabled={draftRounds.length <= 1}
                    sx={{ flexShrink: 0, mt: 0.5 }}
                    aria-label={`Удалить раунд ${round.roundIndex + 1}`}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1,
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 1,
          }}
        >
          <Tooltip title="Удалить дебаты">
            <IconButton
              color="error"
              onClick={() => setConfirmDeleteSeries(true)}
              aria-label="Удалить дебаты"
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose}>Отмена</Button>
            <Button
              variant="contained"
              onClick={() => {
                onSave({
                  resultTitle: draftTitle.trim(),
                  options: draftOptions,
                  rounds: draftRounds.map((round) => ({
                    formIndex: round.formIndex,
                    text: round.text,
                  })),
                });
                onClose();
              }}
            >
              Сохранить
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteSeries}
        onClose={() => setConfirmDeleteSeries(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить дебаты</DialogTitle>
        <DialogContent>
          <Typography>
            Удалить всю серию дебатов ({roundsCount} {roundsCount === 1 ? "раунд" : "раунда"})? Это
            действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteSeries(false)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmDeleteSeries(false);
              onClose();
              onRemoveSeries();
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteRoundIndex !== null}
        onClose={() => setConfirmDeleteRoundIndex(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить раунд</DialogTitle>
        <DialogContent>
          <Typography>Удалить этот раунд? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteRoundIndex(null)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDeleteRoundIndex !== null) {
                onRemoveRound(confirmDeleteRoundIndex);
              }
              setConfirmDeleteRoundIndex(null);
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function DebateSeriesCumulativePreview(props: {
  seriesId: string;
  formIndices: number[];
  questionForms: QuestionForm[];
  questionResults: QuestionResult[];
  publicViewMode: PublicViewMode;
  publicViewQuestionId?: string;
}) {
  const {
    seriesId,
    formIndices,
    questionForms,
    questionResults,
    publicViewMode,
    publicViewQuestionId,
  } = props;
  const rounds = formIndices
    .map((i) => ({ index: i, q: questionForms[i] }))
    .filter((row): row is { index: number; q: QuestionForm } => Boolean(row.q))
    .sort((a, b) => (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index);
  if (rounds.length === 0) return null;

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

  return (
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
  onAddRound: (globalIndex: number) => void;
  onCloneSeries: (seriesId: string) => void;
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
    onAddRound,
    onCloneSeries,
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
  const seriesSaved = formIndices.every((i) => Boolean(questionForms[i]?.id));
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
        <Button
          startIcon={<ContentCopyIcon />}
          size="small"
          variant="outlined"
          disabled={!seriesSaved}
          onClick={() => onCloneSeries(seriesId)}
        >
          Клонировать
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

export function DebateSeriesBlockShell(props: {
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
  onCloneSeries: (seriesId: string) => void;
  onSaveSeries: (
    seriesId: string,
    payload: {
      resultTitle: string;
      options: DebateSeriesEditOptionDraft[];
      rounds: Array<{ formIndex: number; text: string }>;
    },
  ) => void;
  onRemoveSeries: (seriesId: string) => void;
  onRemoveRound: (formIndex: number) => void;
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
    onCloneSeries,
    onSaveSeries,
    onRemoveSeries,
    onRemoveRound,
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
  const rounds = formIndices
    .map((formIndex) => {
      const q = questionForms[formIndex];
      if (!q) return null;
      return {
        formIndex,
        roundIndex: q.debateRoundIndex ?? 0,
        text: q.text,
      };
    })
    .filter((row): row is DebateSeriesEditRoundDraft => Boolean(row))
    .sort((a, b) => a.roundIndex - b.roundIndex || a.formIndex - b.formIndex);
  const roundsCount = rounds.length;
  const adminDoneDisabled = formIndices.some((i) => !questionForms[i]?.id);
  const resultTitle = resolveDebateSeriesResultTitle(
    formIndices.map((i) => questionForms[i]?.debateSeriesResultTitle).find((t) => t?.trim()) ??
      null,
  );
  const seedQuestion = rounds[0] ? questionForms[rounds[0].formIndex] : undefined;
  const editOptions: DebateSeriesEditOptionDraft[] = withDebateOptionColors(
    seedQuestion?.options ?? [],
  ).map((option, index) => ({
    text: option.text,
    color: option.color ?? debateDefaultOptionColor(index),
  }));
  const seriesRounds = formIndices
    .map((i) => ({ index: i, q: questionForms[i] }))
    .filter((row): row is { index: number; q: QuestionForm } => Boolean(row.q))
    .sort((a, b) => (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index);
  const cumulativeSeed = seriesRounds[seriesRounds.length - 1];
  const cumulativeCanShow = Boolean(cumulativeSeed?.q.id);
  const cumulativeOnProjector =
    publicViewMode === "debate_series" &&
    Boolean(seriesId) &&
    seriesRounds.some(
      ({ q }) => q.id === publicViewQuestionId && q.debateSeriesId?.trim() === seriesId,
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
        cumulativeOnProjector={cumulativeOnProjector}
        cumulativeCanShow={cumulativeCanShow}
        onToggleCumulativeOnProjector={() => {
          if (!cumulativeSeed?.q.id) {
            setMessage("Сначала сохраните раунды");
            return;
          }
          if (cumulativeOnProjector) {
            setPublicResultsView("title");
            return;
          }
          setPublicResultsView("debate_series", cumulativeSeed.q.id, {
            debateSeriesId: seriesId,
            debateSeriesView: "cumulative",
            debateSeriesQuestionIds: seriesRounds
              .map(({ q }) => q.id)
              .filter((id): id is string => Boolean(id)),
            debateSeriesShowRounds,
          });
        }}
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
        options={editOptions}
        rounds={rounds}
        onClose={() => setEditOpen(false)}
        onSave={(payload) => onSaveSeries(seriesId, payload)}
        onRemoveSeries={() => onRemoveSeries(seriesId)}
        onRemoveRound={onRemoveRound}
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
          onAddRound={onAddRound}
          onCloneSeries={onCloneSeries}
        />
      </Collapse>
    </Paper>
  );
}
