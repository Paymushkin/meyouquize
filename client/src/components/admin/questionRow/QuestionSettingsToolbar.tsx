import AddIcon from "@mui/icons-material/Add";
import PieChartIcon from "@mui/icons-material/PieChart";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import RestoreIcon from "@mui/icons-material/Restore";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TuneIcon from "@mui/icons-material/Tune";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { isDebatePollPreset, isGeoPollPreset } from "@meyouquize/shared";
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
  showRestoreVoteResults?: boolean;
  onRestoreVoteResults?: () => void;
  showVoteAdjustToggle?: boolean;
  voteAdjustEditVisible?: boolean;
  onToggleVoteAdjustEdit?: () => void;
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
    showRestoreVoteResults = false,
    onRestoreVoteResults,
    showVoteAdjustToggle = false,
    voteAdjustEditVisible = false,
    onToggleVoteAdjustEdit,
  } = props;

  const isGeoPoll = isGeoPollPreset(question);
  const isDebatePoll = isDebatePollPreset(question);

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {showVoteAdjustToggle ? (
          <Tooltip title={voteAdjustEditVisible ? "Скрыть правку голосов" : "Правка голосов"}>
            <IconButton
              size="small"
              onClick={onToggleVoteAdjustEdit}
              aria-label={voteAdjustEditVisible ? "Скрыть правку голосов" : "Правка голосов"}
              aria-pressed={voteAdjustEditVisible}
              color={voteAdjustEditVisible ? "primary" : "default"}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        {showRestoreVoteResults ? (
          <Tooltip title="Восстановить все реальные результаты">
            <IconButton
              size="small"
              onClick={onRestoreVoteResults}
              aria-label="Восстановить все реальные результаты"
            >
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {question.type !== "tag_cloud" && !isGeoPoll && !isDebatePoll ? (
          <Tooltip
            title={
              (question.showVoteCount ?? false)
                ? "Скрыть кол-во голосов"
                : "Показать кол-во голосов"
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
        ) : null}
        {question.type !== "tag_cloud" &&
        question.type !== "ranking" &&
        !isGeoPoll &&
        !isDebatePoll ? (
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
        ) : null}
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
              <PieChartIcon fontSize="small" />
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
    </Stack>
  );
}
