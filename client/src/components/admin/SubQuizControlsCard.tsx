import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { Button, Card, CardContent, Divider, Stack, TextField, Tooltip } from "@mui/material";

type Props = {
  activeLocalIndex: number;
  quizIndexMap: number[];
  quizId: string;
  isLeaderboardShown: boolean;
  firstCorrectWinnersCount: number;
  highlightedLeadersCount: number;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  onToggleResults: () => void;
  onChangeLeadersTop: (next: number) => void;
  onCommitLeadersTop: (next: number) => void;
  onChangeResultsUsers: (next: number) => void;
  onCommitResultsUsers: (next: number) => void;
};

export function SubQuizControlsCard(props: Props) {
  const {
    activeLocalIndex,
    quizIndexMap,
    quizId,
    isLeaderboardShown,
    firstCorrectWinnersCount,
    highlightedLeadersCount,
    onPrev,
    onNext,
    onFinish,
    onToggleResults,
    onChangeLeadersTop,
    onCommitLeadersTop,
    onChangeResultsUsers,
    onCommitResultsUsers,
  } = props;

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<ChevronLeftIcon />}
            onClick={onPrev}
            disabled={activeLocalIndex <= 0}
            sx={{
              textTransform: "none",
              borderColor: "divider",
              color: "text.primary",
            }}
          >
            Назад
          </Button>
          <Button
            variant="contained"
            size="small"
            endIcon={<ChevronRightIcon />}
            onClick={onNext}
            disabled={quizIndexMap.length === 0}
            sx={{ textTransform: "none" }}
          >
            {activeLocalIndex < 0 ? "Начать" : "Вперёд"}
          </Button>
          <Tooltip title="Снять все вопросы этого квиза с экрана и показать участникам экран «Квиз завершён»">
            <span>
              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<DoneAllIcon />}
                onClick={onFinish}
                disabled={!quizId || quizIndexMap.length === 0}
                sx={{ textTransform: "none" }}
              >
                Завершить
              </Button>
            </span>
          </Tooltip>
          <Button
            variant={isLeaderboardShown ? "contained" : "outlined"}
            size="small"
            color={isLeaderboardShown ? "secondary" : "primary"}
            startIcon={<LeaderboardIcon />}
            onClick={onToggleResults}
            disabled={!quizId}
            sx={{ textTransform: "none" }}
          >
            Результаты
          </Button>
        </Stack>
        <Divider flexItem sx={{ my: 1.25 }} />
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          sx={{ pt: 1 }}
        >
          <TextField
            type="number"
            label="Лидеров (TOP)"
            size="small"
            value={firstCorrectWinnersCount}
            onChange={(e) => onChangeLeadersTop(Number(e.target.value) || 1)}
            onBlur={(e) => onCommitLeadersTop(Number(e.target.value))}
            sx={{ width: 152 }}
            inputProps={{ min: 1, max: 20 }}
          />
          <TextField
            type="number"
            label="Пользователей в результатах"
            size="small"
            value={highlightedLeadersCount}
            onChange={(e) => onChangeResultsUsers(Number(e.target.value) || 0)}
            onBlur={(e) => onCommitResultsUsers(Number(e.target.value))}
            sx={{ width: 250 }}
            inputProps={{ min: 0, max: 100 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
