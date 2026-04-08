import AddIcon from "@mui/icons-material/Add";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButton, Stack, Tooltip } from "@mui/material";
import type { QuestionForm } from "../../../admin/adminEventForm";

type Props = {
  question: QuestionForm;
  globalIndex: number;
  updateQuestionShowVoteCount: (globalIndex: number, next: boolean) => void;
  updateQuestionShowTitle: (globalIndex: number, next: boolean) => void;
  openTagInputDialog: (globalIndex: number) => void;
  confirmResetQuestionAnswersByIndex: (globalIndex: number) => void;
};

/** Верхняя панель иконок в раскрытых настройках вопроса. */
export function QuestionSettingsToolbar(props: Props) {
  const {
    question,
    globalIndex,
    updateQuestionShowVoteCount,
    updateQuestionShowTitle,
    openTagInputDialog,
    confirmResetQuestionAnswersByIndex,
  } = props;

  return (
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5}>
      {question.type !== "tag_cloud" && (
        <Tooltip title={(question.showVoteCount ?? true) ? "Скрыть кол-во голосов" : "Показать кол-во голосов"}>
          <IconButton
            size="small"
            onClick={() => updateQuestionShowVoteCount(globalIndex, !(question.showVoteCount ?? true))}
            aria-label="Показывать кол-во голосов"
          >
            {(question.showVoteCount ?? true)
              ? <VisibilityIcon fontSize="small" color="action" />
              : <VisibilityOffIcon fontSize="small" color="action" />}
          </IconButton>
        </Tooltip>
      )}
      {question.type === "tag_cloud" && (
        <Tooltip title={(question.showQuestionTitle ?? true) ? "Скрыть вопрос на экране" : "Показать вопрос на экране"}>
          <IconButton
            size="small"
            onClick={() => updateQuestionShowTitle(globalIndex, !(question.showQuestionTitle ?? true))}
            aria-label="Показывать вопрос на экране"
          >
            {(question.showQuestionTitle ?? true)
              ? <CheckBoxIcon fontSize="small" color="action" />
              : <CheckBoxOutlineBlankIcon fontSize="small" color="action" />}
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
      <Tooltip title="Обнулить ответы по этому вопросу">
        <IconButton color="warning" size="small" onClick={() => confirmResetQuestionAnswersByIndex(globalIndex)}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
