import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export type AdminEventConfirmDialogsProps = {
  confirmResetQuestionIndex: number | null;
  onCloseResetQuestion: () => void;
  onConfirmResetQuestion: () => void;
  confirmResetSubQuizAnswers: { subQuizId: string; title: string } | null;
  onCloseResetSubQuiz: () => void;
  onConfirmResetSubQuiz: () => void;
  confirmDeleteSubQuizId: string | null;
  onCloseDeleteSubQuiz: () => void;
  onConfirmDeleteSubQuiz: () => void | Promise<void>;
  confirmDeleteQuestionIndex: number | null;
  onCloseDeleteQuestion: () => void;
  onConfirmDeleteQuestion: () => void | Promise<void>;
  confirmResetDemoOpen: boolean;
  onCloseResetDemo: () => void;
  onConfirmResetDemo: () => void | Promise<void>;
};

export function AdminEventConfirmDialogs({
  confirmResetQuestionIndex,
  onCloseResetQuestion,
  onConfirmResetQuestion,
  confirmResetSubQuizAnswers,
  onCloseResetSubQuiz,
  onConfirmResetSubQuiz,
  confirmDeleteSubQuizId,
  onCloseDeleteSubQuiz,
  onConfirmDeleteSubQuiz,
  confirmDeleteQuestionIndex,
  onCloseDeleteQuestion,
  onConfirmDeleteQuestion,
  confirmResetDemoOpen,
  onCloseResetDemo,
  onConfirmResetDemo,
}: AdminEventConfirmDialogsProps) {
  return (
    <>
      <Dialog
        open={confirmResetQuestionIndex !== null}
        onClose={onCloseResetQuestion}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Подтверждение</DialogTitle>
        <DialogContent>
          <Typography>
            Будут удалены все ответы участников и сброшены ручные правки результатов (голоса, теги,
            температуру).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResetQuestion}>Отмена</Button>
          <Button color="warning" variant="contained" onClick={onConfirmResetQuestion}>
            Обнулить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmResetSubQuizAnswers !== null}
        onClose={onCloseResetSubQuiz}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Обнулить результаты квиза?</DialogTitle>
        <DialogContent>
          <Typography>
            Будут удалены все ответы участников по квизу «{confirmResetSubQuizAnswers?.title}» и
            сброшены ручные правки результатов по его вопросам. Таблица лидеров и баллы по этому
            квизу сбросятся. Действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResetSubQuiz}>Отмена</Button>
          <Button color="error" variant="contained" onClick={onConfirmResetSubQuiz}>
            Обнулить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteSubQuizId !== null}
        onClose={onCloseDeleteSubQuiz}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить квиз</DialogTitle>
        <DialogContent>
          <Typography>Удалить квиз? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteSubQuiz}>Отмена</Button>
          <Button color="error" variant="contained" onClick={() => void onConfirmDeleteSubQuiz()}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteQuestionIndex !== null}
        onClose={onCloseDeleteQuestion}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить голосование</DialogTitle>
        <DialogContent>
          <Typography>Удалить это голосование? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteQuestion}>Отмена</Button>
          <Button color="error" variant="contained" onClick={() => void onConfirmDeleteQuestion()}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmResetDemoOpen} onClose={onCloseResetDemo} maxWidth="xs" fullWidth>
        <DialogTitle>Сбросить demo</DialogTitle>
        <DialogContent>
          <Typography>
            Сбросить ивент `demo` к тестовым данным? Все текущие изменения будут перезаписаны.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseResetDemo}>Отмена</Button>
          <Button color="error" variant="contained" onClick={() => void onConfirmResetDemo()}>
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
