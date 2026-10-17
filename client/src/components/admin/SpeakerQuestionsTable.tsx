import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import { SPEAKER_ALL_TARGET, SPEAKER_NOT_SELECTED } from "@meyouquize/shared";
import {
  nextDir,
  type SortKey,
  type SortState,
} from "../../features/speakerQuestionsAdmin/speakerQuestionsSort";
import { useSpeakerQuestionsTableState } from "../../features/speakerQuestionsAdmin/useSpeakerQuestionsTableState";

const PAGE_SIZE = 50;

function speakerRecipientDisplayName(speakerName: string): string {
  if (speakerName === SPEAKER_ALL_TARGET) return "Все спикеры";
  if (speakerName === SPEAKER_NOT_SELECTED) return "Не выбрано";
  return speakerName;
}

/** Текст для буфера: «Кому: …» + текст вопроса из поля редактирования. */
export function buildSpeakerQuestionClipboardText(
  speakerName: string,
  questionText: string,
): string {
  return `Кому: ${speakerRecipientDisplayName(speakerName)}\n${questionText}`;
}

async function copySpeakerQuestionToClipboard(
  speakerName: string,
  questionText: string,
): Promise<void> {
  const value = buildSpeakerQuestionClipboardText(speakerName, questionText);
  if (!value.trim()) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // unsupported browser / denied permission
  }
}

type Props = {
  rows: SpeakerQuestionItem[];
  title: string;
  actionHeader: string;
  actionAriaLabel: string;
  actionIcon: ReactNode;
  showScreenColumn: boolean;
  onSetUserVisible: (id: string, next: boolean) => void;
  onSetModeratorVisible: (id: string, next: boolean) => void;
  onSetOnScreen?: (id: string, next: boolean) => void;
  onUpdateQuestionText: (id: string, text: string) => void;
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
};

type TableSortKey = SortKey;

type SortableHeaderProps<T extends TableSortKey> = {
  label: ReactNode;
  sort: SortState<T>;
  sortKey: T;
  onChange: (next: SortState<T>) => void;
};

function SortableHeader<T extends TableSortKey>({
  label,
  sort,
  sortKey,
  onChange,
}: SortableHeaderProps<T>) {
  return (
    <TableSortLabel
      active={sort.key === sortKey}
      direction={sort.key === sortKey ? sort.dir : "asc"}
      onClick={() => onChange({ key: sortKey, dir: nextDir(sort.key === sortKey, sort.dir) })}
    >
      {label}
    </TableSortLabel>
  );
}

export function SpeakerQuestionsTable({
  rows,
  title,
  actionHeader,
  actionAriaLabel,
  actionIcon,
  showScreenColumn,
  onSetUserVisible,
  onSetModeratorVisible,
  onSetOnScreen,
  onUpdateQuestionText,
  onAction,
  onDelete,
}: Props) {
  const {
    sort,
    setSort,
    sortedRows,
    sequenceById,
    getDraftValue,
    setDraftValue,
    canSaveDraft,
    getTrimmedDraft,
  } = useSpeakerQuestionsTableState(rows);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [page, sortedRows]);

  return (
    <Stack spacing={1}>
      <Typography variant="h6">
        {title}
        {rows.length > 0 ? ` (${rows.length})` : ""}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={56}>
                <SortableHeader label="#" sort={sort} sortKey="created" onChange={setSort} />
              </TableCell>
              <TableCell width={180}>
                <SortableHeader label="Автор" sort={sort} sortKey="author" onChange={setSort} />
              </TableCell>
              <TableCell width={170}>
                <SortableHeader label="Кому" sort={sort} sortKey="speaker" onChange={setSort} />
              </TableCell>
              <TableCell width={80} align="center">
                <SortableHeader sort={sort} sortKey="rating" onChange={setSort} label="Реакц." />
              </TableCell>
              <TableCell sx={{ minWidth: 320 }}>
                <SortableHeader label="Вопрос" sort={sort} sortKey="question" onChange={setSort} />
              </TableCell>
              <TableCell width={72}>
                <SortableHeader label="UI" sort={sort} sortKey="ui" onChange={setSort} />
              </TableCell>
              <TableCell width={72}>
                <SortableHeader label="Мод." sort={sort} sortKey="moderator" onChange={setSort} />
              </TableCell>
              {showScreenColumn ? (
                <TableCell width={72}>
                  <SortableHeader label="Экран" sort={sort} sortKey="screen" onChange={setSort} />
                </TableCell>
              ) : null}
              <TableCell width={110}>
                <SortableHeader
                  label={actionHeader}
                  sort={sort}
                  sortKey="action"
                  onChange={setSort}
                />
              </TableCell>
              <TableCell width={72} align="center">
                Удал.
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((q) => (
              <TableRow key={q.id} hover>
                <TableCell>{sequenceById.get(q.id) ?? "—"}</TableCell>
                <TableCell>
                  <Typography variant="body2">{q.authorNickname}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {speakerRecipientDisplayName(q.speakerName)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {Object.values(q.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      value={getDraftValue(q)}
                      onChange={(e) => setDraftValue(q.id, e.target.value)}
                      multiline
                      minRows={2}
                      maxRows={6}
                      fullWidth
                    />
                    <Stack spacing={0.25}>
                      <IconButton
                        size="small"
                        aria-label="Скопировать вопрос"
                        onClick={() =>
                          void copySpeakerQuestionToClipboard(q.speakerName, getDraftValue(q))
                        }
                      >
                        <ContentCopyOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Сохранить вопрос"
                        onClick={() => onUpdateQuestionText(q.id, getTrimmedDraft(q))}
                        disabled={!canSaveDraft(q)}
                      >
                        <SaveOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    label=""
                    control={
                      <Switch
                        checked={q.userVisible}
                        onChange={(_, next) => onSetUserVisible(q.id, next)}
                        inputProps={{ "aria-label": "Видимость у игроков" }}
                      />
                    }
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    label=""
                    control={
                      <Switch
                        checked={q.moderatorVisible === true}
                        onChange={(_, next) => onSetModeratorVisible(q.id, next)}
                        inputProps={{ "aria-label": "Видимость на странице модератора" }}
                      />
                    }
                  />
                </TableCell>
                {showScreenColumn ? (
                  <TableCell>
                    <FormControlLabel
                      sx={{ m: 0 }}
                      label=""
                      control={
                        <Switch
                          checked={q.isOnScreen}
                          onChange={(_, next) => onSetOnScreen?.(q.id, next)}
                          inputProps={{ "aria-label": "Показать на экране" }}
                        />
                      }
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <IconButton
                    size="small"
                    aria-label={actionAriaLabel}
                    onClick={() => onAction(q.id)}
                  >
                    {actionIcon}
                  </IconButton>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Удалить вопрос"
                    onClick={() => onDelete(q.id)}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {sortedRows.length > PAGE_SIZE ? (
            <TableFooter>
              <TableRow>
                <TablePagination
                  colSpan={showScreenColumn ? 10 : 9}
                  count={sortedRows.length}
                  page={page}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`
                  }
                />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </TableContainer>
    </Stack>
  );
}
