import DownloadIcon from "@mui/icons-material/Download";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TableContainer,
  TablePagination,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  leaderboardPlaceByScore,
  type LeaderboardItem,
  type LeaderboardSort,
} from "../../admin/adminEventTypes";

type Props = {
  leaderboardSort: LeaderboardSort;
  setLeaderboardSort: (value: LeaderboardSort) => void;
  displayedLeaderboard: LeaderboardItem[];
  exportLeaderboardCsv: () => void;
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
    subQuizLeaderboardOptions,
    selectedResultsSubQuizId,
    onSelectResultsSubQuiz,
  } = props;
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
  useEffect(() => {
    setPage(0);
  }, [displayedLeaderboard.length, rowsPerPage, leaderboardSort]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Результаты пользователей
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="nowrap"
          sx={{ mb: 2, pt: 0.5, overflowX: "auto" }}
        >
          {subQuizLeaderboardOptions.length > 1 ? (
            <FormControl size="small" sx={{ minWidth: 220, flexShrink: 0 }}>
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
          <Box sx={{ flex: 1, minWidth: 0 }} />
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
        </Stack>
        {displayedLeaderboard.length === 0 ? (
          <Typography color="text.secondary">Пока нет ответов пользователей.</Typography>
        ) : (
          <>
            <TableContainer
              sx={{ maxHeight: 480, border: 1, borderColor: "divider", borderRadius: 1 }}
            >
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
                    const topRowSx =
                      scorePlace === 1
                        ? { bgcolor: "warning.50" }
                        : scorePlace === 3
                          ? { bgcolor: "orange.50" }
                          : undefined;
                    return (
                      <TableRow
                        key={item.participantId}
                        sx={{
                          ...topRowSx,
                          ...(topRowSx
                            ? {
                                "& .MuiTableCell-root": {
                                  color: "text.primary",
                                },
                              }
                            : {}),
                        }}
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
