import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";

type DetailPayload = {
  question: { id: string; text: string; type: "single" | "multi" | "tag_cloud" | "ranking" };
  firstCorrect: null | { participantId: string; nickname: string; submittedAt: string };
  optionStats: Array<{
    optionId: string;
    text: string;
    count: number;
    isCorrect: boolean;
    avgRank?: number;
  }>;
  tagCloud: Array<{ text: string; count: number }>;
  answerRows: Array<{
    participantId: string;
    nickname: string;
    submittedAt: string;
    labels: string[];
    isCorrect: boolean;
  }>;
};

export function AdminVoteDetailPage() {
  const { eventName = "", questionId = "" } = useParams();
  const [isAuth, setIsAuth] = useState(false);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [error, setError] = useState("");

  async function checkSession() {
    const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
    setIsAuth(response.ok);
    return response.ok;
  }

  useEffect(() => {
    document.title = "Голосование — админ";
    void checkSession();
  }, []);

  useEffect(() => {
    if (!isAuth || !eventName || !questionId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${eventName}/votes/${questionId}/detail`,
          { credentials: "include", signal: controller.signal },
        );
        if (!response.ok) {
          setError(
            response.status === 404
              ? "Вопрос не найден или не голосование комнаты."
              : "Ошибка загрузки",
          );
          setDetail(null);
          return;
        }
        const data = (await response.json()) as DetailPayload;
        setDetail(data);
        setError("");
      } catch {
        setError("Ошибка сети");
        setDetail(null);
      }
    })();
    return () => controller.abort();
  }, [isAuth, eventName, questionId]);

  if (!isAuth) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom>
          Админ
        </Typography>
        <AdminLoginForm
          onSuccess={() => {
            setIsAuth(true);
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Button
          component={RouterLink}
          to={`/admin/${eventName}`}
          startIcon={<ArrowBackIcon />}
          variant="text"
          sx={{ alignSelf: "flex-start" }}
        >
          К комнате
        </Button>
        {!!error && <Alert severity="warning">{error}</Alert>}
        {detail && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Голосование комнаты ({detail.question.type})
              </Typography>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {detail.question.text}
              </Typography>
              {(detail.question.type === "single" || detail.question.type === "ranking") && (
                <Box sx={{ my: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {detail.question.type === "ranking"
                      ? "Первый полностью верный порядок"
                      : "Первый верный ответ"}
                  </Typography>
                  {detail.firstCorrect ? (
                    <Typography>
                      {detail.firstCorrect.nickname}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {new Date(detail.firstCorrect.submittedAt).toLocaleString("ru-RU")}
                      </Typography>
                    </Typography>
                  ) : (
                    <Typography color="text.secondary">
                      {detail.question.type === "ranking"
                        ? "Пока никто не угадал эталонный порядок."
                        : "Нет подходящей записи (не SINGLE с одним правильным или пока никто не угадал)."}
                    </Typography>
                  )}
                </Box>
              )}
              {detail.question.type !== "tag_cloud" && detail.question.type !== "ranking" && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Сводка по вариантам
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Вариант</TableCell>
                        <TableCell align="right">Голосов</TableCell>
                        <TableCell>Правильный</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.optionStats.map((o) => (
                        <TableRow key={o.optionId}>
                          <TableCell>{o.text}</TableCell>
                          <TableCell align="right">{o.count}</TableCell>
                          <TableCell>{o.isCorrect ? "да" : "нет"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              {detail.question.type === "ranking" && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Сводка по ранжированию
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Вариант</TableCell>
                        <TableCell align="right">Эталон (место)</TableCell>
                        <TableCell align="right">Средний ранг</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.optionStats.map((o, index) => (
                        <TableRow key={o.optionId}>
                          <TableCell>{o.text}</TableCell>
                          <TableCell align="right">{index + 1}</TableCell>
                          <TableCell align="right">
                            {typeof o.avgRank === "number" && o.avgRank > 0
                              ? o.avgRank.toFixed(2)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              {detail.question.type === "tag_cloud" && detail.tagCloud.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Частоты тегов
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Тег</TableCell>
                        <TableCell align="right">Раз</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.tagCloud.map((row) => (
                        <TableRow key={row.text}>
                          <TableCell>{row.text}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                Все ответы
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Участник</TableCell>
                    <TableCell>Время</TableCell>
                    <TableCell>Выбор</TableCell>
                    <TableCell>Верно</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.answerRows.map((row) => (
                    <TableRow key={`${row.participantId}-${row.submittedAt}`}>
                      <TableCell>{row.nickname}</TableCell>
                      <TableCell>{new Date(row.submittedAt).toLocaleString("ru-RU")}</TableCell>
                      <TableCell>{row.labels.join(", ")}</TableCell>
                      <TableCell>{row.isCorrect ? "да" : "нет"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
