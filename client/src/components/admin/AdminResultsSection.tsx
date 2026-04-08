import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TableContainer,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { leaderboardPlaceByScore, type LeaderboardItem, type LeaderboardSort } from "../../admin/adminEventTypes";
import type { PublicViewMode } from "../../publicViewContract";

type Props = {
  leaderboardSort: LeaderboardSort;
  setLeaderboardSort: (value: LeaderboardSort) => void;
  displayedLeaderboard: LeaderboardItem[];
  exportLeaderboardCsv: () => void;
  publicViewMode: PublicViewMode;
  setPublicResultsView: (mode: "title" | "question" | "leaderboard", questionIdForMode?: string) => void;
  highlightedLeadersCount: number;
  setHighlightedLeadersCount: (value: number) => void;
  updateHighlightedLeaders: (value: number) => void;
  resetResultsUiSettings: () => void;
  showFirstCorrectAnswerer: boolean;
  onShowFirstCorrectAnswererChange: (value: boolean) => void;
  firstCorrectWinnersCount: number;
  setFirstCorrectWinnersCount: (value: number) => void;
  updateFirstCorrectWinnersCount: (raw: number) => void;
  subQuizLeaderboardOptions: Array<{ subQuizId: string; title: string }>;
  selectedResultsSubQuizId: string;
  onSelectResultsSubQuiz: (subQuizId: string) => void;
};

export function AdminResultsSection(props: Props) {
  const {
    leaderboardSort,
    setLeaderboardSort,
    displayedLeaderboard,
    exportLeaderboardCsv,
    publicViewMode,
    setPublicResultsView,
    highlightedLeadersCount,
    setHighlightedLeadersCount,
    updateHighlightedLeaders,
    resetResultsUiSettings,
    showFirstCorrectAnswerer,
    onShowFirstCorrectAnswererChange,
    firstCorrectWinnersCount,
    setFirstCorrectWinnersCount,
    updateFirstCorrectWinnersCount,
    subQuizLeaderboardOptions,
    selectedResultsSubQuizId,
    onSelectResultsSubQuiz,
  } = props;
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  function togglePlaceSort() {
    if (leaderboardSort === "place_asc") setLeaderboardSort("place_desc");
    else if (leaderboardSort === "place_desc") setLeaderboardSort("place_asc");
    else setLeaderboardSort("place_asc");
  }

  function toggleScoreSort() {
    if (leaderboardSort === "score_desc") setLeaderboardSort("score_asc");
    else if (leaderboardSort === "score_asc") setLeaderboardSort("score_desc");
    else setLeaderboardSort("score_desc");
  }

  function toggleNameSort() {
    if (leaderboardSort === "name_asc") setLeaderboardSort("name_desc");
    else if (leaderboardSort === "name_desc") setLeaderboardSort("name_asc");
    else setLeaderboardSort("name_asc");
  }

  const placeSortActive = leaderboardSort === "place_asc" || leaderboardSort === "place_desc";
  const scoreSortActive = leaderboardSort === "score_desc" || leaderboardSort === "score_asc";
  const nameSortActive = leaderboardSort === "name_asc" || leaderboardSort === "name_desc";

  const placeByParticipantId = useMemo(
    () => leaderboardPlaceByScore(displayedLeaderboard),
    [displayedLeaderboard],
  );
  const pagedLeaderboard = useMemo(() => {
    const start = page * rowsPerPage;
    return displayedLeaderboard.slice(start, start + rowsPerPage);
  }, [displayedLeaderboard, page, rowsPerPage]);
  const sortLabel = useMemo(() => {
    if (leaderboardSort === "place_asc") return "Место: по возрастанию";
    if (leaderboardSort === "place_desc") return "Место: по убыванию";
    if (leaderboardSort === "score_desc") return "Баллы: по убыванию";
    if (leaderboardSort === "score_asc") return "Баллы: по возрастанию";
    if (leaderboardSort === "name_desc") return "Участник: Я-А";
    return "Участник: А-Я";
  }, [leaderboardSort]);

  useEffect(() => {
    setPage(0);
  }, [displayedLeaderboard.length, rowsPerPage, leaderboardSort]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Результаты пользователей
        </Typography>
        {subQuizLeaderboardOptions.length > 1 ? (
          <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
            <InputLabel id="mq-subquiz-lb-label">Таблица по квизу</InputLabel>
            <Select
              labelId="mq-subquiz-lb-label"
              label="Таблица по квизу"
              value={selectedResultsSubQuizId}
              onChange={(e) => onSelectResultsSubQuiz(String(e.target.value))}
            >
              {subQuizLeaderboardOptions.map((o) => (
                <MenuItem key={o.subQuizId} value={o.subQuizId}>
                  {o.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="nowrap"
          sx={{ mb: 2, pt: 1.5, overflowX: "auto" }}
        >
          <Tooltip title="Экспорт CSV">
            <IconButton
              onClick={exportLeaderboardCsv}
              color="primary"
              aria-label="Экспорт CSV"
              size="small"
              sx={{ flexShrink: 0 }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          {isXs ? (
            <Tooltip title={publicViewMode === "leaderboard" ? "Скрыть таблицу" : "Показать таблицу"}>
              <IconButton
                onClick={() => setPublicResultsView(publicViewMode === "leaderboard" ? "title" : "leaderboard")}
                color="primary"
                size="small"
                sx={{ flexShrink: 0 }}
                aria-label={publicViewMode === "leaderboard" ? "Скрыть таблицу" : "Показать таблицу"}
              >
                {publicViewMode === "leaderboard" ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPublicResultsView(publicViewMode === "leaderboard" ? "title" : "leaderboard")}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {publicViewMode === "leaderboard" ? "Скрыть таблицу" : "Показать таблицу"}
            </Button>
          )}
          <TextField
            type="number"
            label="Подсветка TOP-N"
            value={highlightedLeadersCount}
            onChange={(e) => setHighlightedLeadersCount(Number(e.target.value) || 0)}
            onBlur={(e) => updateHighlightedLeaders(Number(e.target.value))}
            size="small"
            sx={{ width: 150, flexShrink: 0 }}
            inputProps={{ min: 0, max: 100 }}
          />
          <FormControlLabel
            control={(
              <Switch
                checked={showFirstCorrectAnswerer}
                onChange={(_e, checked) => onShowFirstCorrectAnswererChange(checked)}
                size="small"
              />
            )}
            label="Верные ответы на экране"
            sx={{ flexShrink: 0, ml: 0 }}
            title="То же, что кнопка с кубком у голосования. Для каждого голосования должно быть разрешено в его настройках."
          />
          <TextField
            type="number"
            label="Число победителей"
            value={firstCorrectWinnersCount}
            onChange={(e) => setFirstCorrectWinnersCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            onBlur={(e) => updateFirstCorrectWinnersCount(Number(e.target.value))}
            size="small"
            disabled={!showFirstCorrectAnswerer}
            sx={{ width: 148, flexShrink: 0 }}
            inputProps={{ min: 1, max: 20 }}
            title="Показывать на проекторе столько первых верно ответивших по времени (голосования комнаты)"
          />
          {isXs ? (
            <Tooltip title="Сбросить настройки отображения">
              <IconButton
                onClick={resetResultsUiSettings}
                color="default"
                size="small"
                sx={{ flexShrink: 0 }}
                aria-label="Сбросить настройки отображения"
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button variant="text" size="small" onClick={resetResultsUiSettings} sx={{ flexShrink: 0 }}>
              Сбросить настройки
            </Button>
          )}
        </Stack>
        {displayedLeaderboard.length === 0 ? (
          <Typography color="text.secondary">Пока нет ответов пользователей.</Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Сортировка: {sortLabel}
            </Typography>
            <TableContainer sx={{ maxHeight: 480, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={placeSortActive}
                    direction={leaderboardSort === "place_desc" ? "desc" : "asc"}
                    onClick={togglePlaceSort}
                  >
                    Место
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={nameSortActive}
                    direction={leaderboardSort === "name_desc" ? "desc" : "asc"}
                    onClick={toggleNameSort}
                  >
                    Участник
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={scoreSortActive}
                    direction={leaderboardSort === "score_asc" ? "asc" : "desc"}
                    onClick={toggleScoreSort}
                    sx={{
                      flexDirection: "row-reverse",
                      justifyContent: "flex-start",
                      width: "100%",
                    }}
                  >
                    Баллы
                  </TableSortLabel>
                </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLeaderboard.map((item) => {
                const scorePlace = placeByParticipantId.get(item.participantId) ?? 0;
                return (
                  <TableRow
                    key={item.participantId}
                    sx={
                      scorePlace === 1
                        ? { bgcolor: "warning.50" }
                        : scorePlace === 2
                          ? { bgcolor: "grey.100" }
                          : scorePlace === 3
                            ? { bgcolor: "orange.50" }
                            : undefined
                    }
                  >
                    <TableCell>{scorePlace}</TableCell>
                    <TableCell title={item.nickname}>{item.nickname}</TableCell>
                    <TableCell align="right">{item.score}</TableCell>
                  </TableRow>
                );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={displayedLeaderboard.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Строк на странице:"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
