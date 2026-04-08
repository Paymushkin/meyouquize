import { Stack, Button, Card, CardContent, Divider, TextField, Typography } from "@mui/material";

type Props = {
  editableTitle: string;
  setEditableTitle: (value: string) => void;
  saveQuizTitle: () => void;
  joinUrl: string;
  qrData: string;
  quizId: string;
  setQuizId: (value: string) => void;
  questionId: string;
  setQuestionId: (value: string) => void;
  finishQuiz: () => void;
};

export function AdminGeneralSection(props: Props) {
  const {
    editableTitle,
    setEditableTitle,
    saveQuizTitle,
    joinUrl,
    qrData,
    quizId,
    setQuizId,
    questionId,
    setQuestionId,
    finishQuiz,
  } = props;

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <TextField
            label="Название квиза"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            onBlur={saveQuizTitle}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Ссылка для участников: {joinUrl}
          </Typography>
          {qrData && <img src={qrData} alt="quiz-qr" style={{ width: 220, height: 220, borderRadius: 12 }} />}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Управление раундом
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Запуск/остановка вопросов выполняется кнопками Вкл/Выкл в списке вопросов.
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField value={quizId} onChange={(e) => setQuizId(e.target.value)} label="Quiz ID" fullWidth />
            <TextField
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              label="Current Question ID"
              fullWidth
            />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Button onClick={finishQuiz} color="error" variant="outlined">
              Завершить квиз
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
