import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";

type Room = {
  id: string;
  slug: string;
  title: string;
  status: string;
  _count: { questions: number; participants: number };
};

export function AdminRoomsPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [eventName, setEventName] = useState("");
  const [title, setTitle] = useState("");
  const [eventNameTouched, setEventNameTouched] = useState(false);
  const [message, setMessage] = useState("");

  function buildEventNameFromTitle(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (normalized.length >= 3) return normalized.slice(0, 60);
    return `quiz-${Date.now().toString().slice(-6)}`;
  }

  async function checkSession() {
    const response = await fetch(`${API_BASE}/api/admin/me`, {
      credentials: "include",
    });
    setIsAuth(response.ok);
    return response.ok;
  }

  async function loadRooms() {
    const response = await fetch(`${API_BASE}/api/admin/rooms`, {
      credentials: "include",
    });
    if (!response.ok) return;
    setRooms(await response.json());
  }

  useEffect(() => {
    document.title = "Админ";
    checkSession().then((ok) => {
      if (ok) loadRooms();
    });
  }, []);

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    const finalEventName = eventName.trim() || buildEventNameFromTitle(title);
    const response = await fetch(`${API_BASE}/api/admin/rooms`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: finalEventName, title }),
    });
    if (!response.ok) {
      let errorText = "Не удалось создать комнату";
      try {
        const payload = await response.json();
        if (payload?.error === "Room title already exists") {
          errorText = "Комната с таким названием уже существует";
        } else if (payload?.error === "Room already exists") {
          errorText = "Комната с таким кодом уже существует";
        }
      } catch {
        // ignore
      }
      setMessage(errorText);
      return;
    }
    setMessage("");
    setEventName("");
    setTitle("");
    setEventNameTouched(false);
    await loadRooms();
  }

  useEffect(() => {
    if (eventNameTouched) return;
    if (!title.trim()) {
      setEventName("");
      return;
    }
    setEventName(buildEventNameFromTitle(title));
  }, [title, eventNameTouched]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Админка: комнаты
      </Typography>
      {!isAuth && <AdminLoginForm onSuccess={() => checkSession().then(() => loadRooms())} />}
      {isAuth && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Создать комнату
              </Typography>
              <Box component="form" onSubmit={createRoom}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    value={eventName}
                    onChange={(e) => {
                      setEventNameTouched(true);
                      setEventName(e.target.value);
                    }}
                    placeholder="eventName (например spring-cup)"
                    label="Код комнаты"
                    helperText="Заполняется автоматически из названия (можно изменить вручную)"
                    fullWidth
                  />
                  <TextField
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название квиза"
                    label="Название"
                    fullWidth
                  />
                  <Button type="submit" variant="contained" sx={{ minWidth: 160 }}>
                    Создать
                  </Button>
                </Stack>
              </Box>
              {message && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {message}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Комнаты
              </Typography>
              {rooms.length === 0 && <Typography color="text.secondary">Пока комнат нет.</Typography>}
              {rooms.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Событие</TableCell>
                      <TableCell>Название</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Вопросы</TableCell>
                      <TableCell>Участники</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id} hover>
                        <TableCell>
                          <Link to={`/admin/${room.slug}`}>{room.slug}</Link>
                        </TableCell>
                        <TableCell>{room.title}</TableCell>
                        <TableCell>
                          <Chip size="small" label={room.status} />
                        </TableCell>
                        <TableCell>{room._count.questions}</TableCell>
                        <TableCell>{room._count.participants}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
}
