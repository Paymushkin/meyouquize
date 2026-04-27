import { type ReactNode } from "react";
import {
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import {
  nextDir,
  type SortKey,
  type SortState,
} from "../../features/speakerQuestionsAdmin/speakerQuestionsSort";
import { useSpeakerQuestionsTableState } from "../../features/speakerQuestionsAdmin/useSpeakerQuestionsTableState";

type Props = {
  rows: SpeakerQuestionItem[];
  title: string;
  actionHeader: string;
  actionAriaLabel: string;
  actionIcon: ReactNode;
  showScreenColumn: boolean;
  onSetUserVisible: (id: string, next: boolean) => void;
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
  onSetOnScreen,
  onUpdateQuestionText,
  onAction,
  onDelete,
}: Props) {
  const { sort, setSort, sortedRows, getDraftValue, setDraftValue, canSaveDraft, getTrimmedDraft } =
    useSpeakerQuestionsTableState(rows);

  return (
    <Stack spacing={1}>
      <Typography variant="h6">{title}</Typography>
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
            {sortedRows.map((q, idx) => (
              <TableRow key={q.id} hover>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2">{q.authorNickname}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {q.speakerName === "Все спикеры" ? "Все спикеры" : q.speakerName}
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
                    <IconButton
                      size="small"
                      aria-label="Сохранить вопрос"
                      onClick={() => onUpdateQuestionText(q.id, getTrimmedDraft(q))}
                      disabled={!canSaveDraft(q)}
                    >
                      <SaveOutlinedIcon fontSize="small" />
                    </IconButton>
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
        </Table>
      </TableContainer>
    </Stack>
  );
}
