import AddIcon from "@mui/icons-material/Add";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButton, Stack, Tooltip } from "@mui/material";
import type { QuestionForm } from "../../../admin/adminEventForm";

type Props = {
  question: QuestionForm;
  globalIndex: number;
  updateQuestionShowVoteCount: (globalIndex: number, next: boolean) => void;
  updateQuestionShowCorrectOption: (globalIndex: number, next: boolean) => void;
  openTagInputDialog: (globalIndex: number) => void;
  confirmResetQuestionAnswersByIndex: (globalIndex: number) => void;
  playerResultsButtonVisible: boolean;
  playerResultsVisible: boolean;
  onTogglePlayerResults: () => void;
};

/** Верхняя панель иконок в раскрытых настройках вопроса. */
export function QuestionSettingsToolbar(props: Props) {
  const {
    question,
    globalIndex,
    updateQuestionShowVoteCount,
    updateQuestionShowCorrectOption,
    openTagInputDialog,
    confirmResetQuestionAnswersByIndex,
    playerResultsButtonVisible,
    playerResultsVisible,
    onTogglePlayerResults,
  } = props;

  return (
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5}>
      {question.type !== "tag_cloud" && (
        <Tooltip
          title={
            (question.showVoteCount ?? false) ? "Скрыть кол-во голосов" : "Показать кол-во голосов"
          }
        >
          <IconButton
            size="small"
            onClick={() =>
              updateQuestionShowVoteCount(globalIndex, !(question.showVoteCount ?? false))
            }
            aria-label="Показывать кол-во голосов"
          >
            {(question.showVoteCount ?? false) ? (
              <VisibilityIcon fontSize="small" color="action" />
            ) : (
              <VisibilityOffIcon fontSize="small" color="action" />
            )}
          </IconButton>
        </Tooltip>
      )}
      {question.type !== "tag_cloud" && question.type !== "ranking" && (
        <Tooltip
          title={
            (question.showCorrectOption ?? false)
              ? "Скрыть правильный ответ"
              : "Показать правильный ответ"
          }
        >
          <IconButton
            size="small"
            onClick={() =>
              updateQuestionShowCorrectOption(globalIndex, !(question.showCorrectOption ?? false))
            }
            aria-label="Показывать правильный ответ на проекторе"
          >
            <TaskAltIcon
              fontSize="small"
              color={(question.showCorrectOption ?? false) ? "success" : "action"}
            />
          </IconButton>
        </Tooltip>
      )}
      {question.type === "tag_cloud" && (
        <Tooltip title="Добавить ответы списком">
          <IconButton
            size="small"
            onClick={() => openTagInputDialog(globalIndex)}
            aria-label="Добавить ответы списком"
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {playerResultsButtonVisible ? (
        <Tooltip
          title={
            playerResultsVisible
              ? "Скрыть результаты в интерфейсе пользователя"
              : "Показать результаты в интерфейсе пользователя"
          }
        >
          <IconButton
            size="small"
            color={playerResultsVisible ? "secondary" : "default"}
            onClick={onTogglePlayerResults}
            aria-label={
              playerResultsVisible
                ? "Скрыть результаты в интерфейсе пользователя"
                : "Показать результаты в интерфейсе пользователя"
            }
            aria-pressed={playerResultsVisible}
            sx={
              playerResultsVisible
                ? {
                    color: "success.main",
                  }
                : undefined
            }
          >
            <LeaderboardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title="Обнулить ответы по этому вопросу">
        <IconButton
          color="warning"
          size="small"
          onClick={() => confirmResetQuestionAnswersByIndex(globalIndex)}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
