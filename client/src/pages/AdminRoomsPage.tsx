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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { API_BASE } from "../config";
import { useAdminAuth } from "../hooks/useAdminAuth";

type Room = {
  id: string;
  slug: string;
  title: string;
  status: string;
  _count: { questions: number; participants: number };
};

export function AdminRoomsPage() {
  const { isAuth, authChecked, admin, checkSession } = useAdminAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [eventName, setEventName] = useState("");
  const [title, setTitle] = useState("");
  const [eventNameTouched, setEventNameTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<Room | null>(null);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deletingRoom, setDeletingRoom] = useState(false);
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const deleteSlugMatches =
    confirmDeleteRoom !== null && deleteConfirmSlug.trim() === confirmDeleteRoom.slug;

  function openDeleteRoomDialog(room: Room) {
    setDeleteConfirmSlug("");
    setConfirmDeleteRoom(room);
  }

  function closeDeleteRoomDialog() {
    if (deletingRoom) return;
    setConfirmDeleteRoom(null);
    setDeleteConfirmSlug("");
  }

  function buildEventNameFromTitle(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (normalized.length >= 3) return normalized.slice(0, 60);
    return `quiz-${Date.now().toString().slice(-6)}`;
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

  async function confirmDeleteRoomAction() {
    if (!confirmDeleteRoom) return;
    setDeletingRoom(true);
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(confirmDeleteRoom.slug)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (response.status === 403) {
        setMessage("Удалять комнаты может только супер-админ");
        closeDeleteRoomDialog();
        return;
      }
      if (!response.ok) {
        setMessage("Не удалось удалить комнату");
        closeDeleteRoomDialog();
        return;
      }
      closeDeleteRoomDialog();
      await loadRooms();
    } finally {
      setDeletingRoom(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav canManageAdmins={isSuperAdmin} />
      {!authChecked ? null : !isAuth ? (
        <AdminLoginForm onSuccess={() => checkSession().then(() => loadRooms())} />
      ) : (
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
                Ивенты
              </Typography>
              {rooms.length === 0 && (
                <Typography color="text.secondary">Пока комнат нет.</Typography>
              )}
              {rooms.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Событие</TableCell>
                      <TableCell>Название</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Вопросы</TableCell>
                      <TableCell>Участники</TableCell>
                      {isSuperAdmin ? <TableCell align="right"> </TableCell> : null}
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
                        {isSuperAdmin ? (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Удалить комнату ${room.slug}`}
                              onClick={() => openDeleteRoomDialog(room)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog
            open={confirmDeleteRoom !== null}
            onClose={closeDeleteRoomDialog}
            maxWidth="xs"
            fullWidth
            disableEscapeKeyDown={deletingRoom}
          >
            <DialogTitle>Удалить комнату?</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <Typography>
                  Будут удалены комната «{confirmDeleteRoom?.slug}» ({confirmDeleteRoom?.title}),
                  все вопросы, ответы ({confirmDeleteRoom?._count.participants ?? 0} участников) и
                  связанные медиафайлы. Действие нельзя отменить.
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Код комнаты для подтверждения"
                  placeholder={confirmDeleteRoom?.slug ?? ""}
                  value={deleteConfirmSlug}
                  onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                  disabled={deletingRoom}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deleteSlugMatches && !deletingRoom) {
                      e.preventDefault();
                      void confirmDeleteRoomAction();
                    }
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteRoomDialog} disabled={deletingRoom}>
                Отмена
              </Button>
              <Button
                color="error"
                variant="contained"
                disabled={deletingRoom || !deleteSlugMatches}
                onClick={() => void confirmDeleteRoomAction()}
              >
                {deletingRoom ? "Удаление…" : "Удалить"}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      )}
    </Container>
  );
}
