import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { API_BASE } from "../config";
import { useAdminAuth } from "../hooks/useAdminAuth";

type AdminUserRow = {
  id: string;
  login: string;
  password: string;
  lastLoginAt: string | null;
};

type UserDraft = {
  login: string;
  password: string;
};

function formatLastLogin(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PasswordField(props: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  hiddenLabel?: boolean;
  autoComplete?: string;
  name?: string;
}) {
  const {
    label,
    value,
    onChange,
    onBlur,
    show,
    onToggleShow,
    placeholder,
    required,
    fullWidth = true,
    size = "medium",
    hiddenLabel = false,
    autoComplete,
    name,
  } = props;
  return (
    <TextField
      label={label}
      hiddenLabel={hiddenLabel}
      placeholder={placeholder}
      name={name}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      required={required}
      fullWidth={fullWidth}
      size={size}
      slotProps={{
        htmlInput: autoComplete ? { autoComplete } : undefined,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                onClick={onToggleShow}
              >
                {show ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function AdminUsersPage() {
  const { isAuth, authChecked, admin, checkSession } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newLogin, setNewLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [showPasswordFor, setShowPasswordFor] = useState<Record<string, boolean>>({});
  const serverDraftsRef = useRef<Record<string, UserDraft>>({});

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);

  function syncDraftsFromUsers(rows: AdminUserRow[]) {
    const next: Record<string, UserDraft> = {};
    for (const row of rows) {
      next[row.id] = { login: row.login, password: row.password };
    }
    serverDraftsRef.current = next;
    setDrafts(next);
  }

  async function loadUsers() {
    const response = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
    if (!response.ok) {
      setError("Недостаточно прав для управления администраторами");
      setUsers([]);
      return;
    }
    const payload = (await response.json()) as { users: AdminUserRow[] };
    const rows = payload.users ?? [];
    setUsers(rows);
    syncDraftsFromUsers(rows);
  }

  useEffect(() => {
    document.title = "Админ: администраторы";
    checkSession().then((ok) => {
      if (ok) void loadUsers();
    });
  }, []);

  async function patchUser(
    userId: string,
    body: { login?: string; password?: string },
  ): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errText = "Не удалось сохранить изменения";
      try {
        const payload = (await response.json()) as { error?: string; code?: string };
        if (payload.code === "LOGIN_TAKEN") errText = "Такой логин уже занят";
      } catch {
        // ignore
      }
      setError(errText);
      return false;
    }
    return true;
  }

  async function handleLoginBlur(user: AdminUserRow) {
    const draft = drafts[user.id];
    const server = serverDraftsRef.current[user.id];
    if (!draft || !server) return;
    const login = draft.login.trim();
    if (login === server.login) return;
    if (!login) {
      setError("Логин не может быть пустым");
      setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, login: server.login } }));
      return;
    }
    setError("");
    const ok = await patchUser(user.id, { login });
    if (!ok) {
      setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, login: server.login } }));
      return;
    }
    setMessage("Логин сохранён");
    await loadUsers();
  }

  async function handlePasswordBlur(user: AdminUserRow) {
    const draft = drafts[user.id];
    const server = serverDraftsRef.current[user.id];
    if (!draft || !server) return;
    const password = draft.password;
    if (password === server.password) return;
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, password: server.password } }));
      return;
    }
    setError("");
    const ok = await patchUser(user.id, { password });
    if (!ok) {
      setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, password: server.password } }));
      return;
    }
    setMessage("Пароль сохранён");
    await loadUsers();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch(`${API_BASE}/api/admin/users`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: newLogin, password: newPassword }),
    });
    if (!response.ok) {
      setError("Не удалось создать администратора");
      return;
    }
    setMessage("Администратор создан");
    setNewLogin("");
    setNewPassword("");
    await loadUsers();
  }

  async function handleChangeOwnPassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch(`${API_BASE}/api/admin/me/password`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
    });
    if (!response.ok) {
      setError("Не удалось сменить пароль. Проверьте текущий пароль.");
      return;
    }
    setCurrentPassword("");
    setNextPassword("");
    setMessage("Пароль успешно обновлён");
  }

  async function handleDelete(userId: string) {
    setError("");
    setMessage("");
    const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setError("Не удалось удалить администратора");
      return;
    }
    setMessage("Администратор удалён");
    await loadUsers();
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav canManageAdmins={admin?.role === "SUPER_ADMIN"} />
      {!authChecked ? null : !isAuth ? (
        <AdminLoginForm onSuccess={() => checkSession().then(() => loadUsers())} />
      ) : admin?.role !== "SUPER_ADMIN" ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Смена пароля
            </Typography>
            <Box component="form" onSubmit={handleChangeOwnPassword}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <PasswordField
                  label="Текущий пароль"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrentPassword}
                  onToggleShow={() => setShowCurrentPassword((prev) => !prev)}
                  required
                />
                <PasswordField
                  label="Новый пароль"
                  value={nextPassword}
                  onChange={setNextPassword}
                  show={showNextPassword}
                  onToggleShow={() => setShowNextPassword((prev) => !prev)}
                  required
                />
                <Button type="submit" variant="contained" sx={{ minWidth: 160 }}>
                  Обновить пароль
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Создать администратора
              </Typography>
              <Box component="form" onSubmit={handleCreate} autoComplete="off">
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Логин"
                    name="new-admin-login"
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      htmlInput: { autoComplete: "off" },
                    }}
                  />
                  <PasswordField
                    label="Пароль"
                    name="new-admin-password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showCreatePassword}
                    onToggleShow={() => setShowCreatePassword((prev) => !prev)}
                    autoComplete="new-password"
                    required
                  />
                  <Button type="submit" variant="contained" sx={{ minWidth: 160 }}>
                    Создать
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Список администраторов
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Логин</TableCell>
                    <TableCell>Пароль</TableCell>
                    <TableCell>Последний вход</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const draft = drafts[user.id] ?? { login: user.login, password: user.password };
                    return (
                      <TableRow key={user.id} hover>
                        <TableCell sx={{ minWidth: 160 }}>
                          <TextField
                            size="small"
                            value={draft.login}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user.id]: { ...draft, login: e.target.value },
                              }))
                            }
                            onBlur={() => void handleLoginBlur(user)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <PasswordField
                            label="Пароль"
                            hiddenLabel
                            placeholder="Пароль"
                            value={draft.password}
                            onChange={(value) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user.id]: { ...draft, password: value },
                              }))
                            }
                            onBlur={() => void handlePasswordBlur(user)}
                            show={showPasswordFor[user.id] ?? false}
                            onToggleShow={() =>
                              setShowPasswordFor((prev) => ({
                                ...prev,
                                [user.id]: !prev[user.id],
                              }))
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatLastLogin(user.lastLoginAt)}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleDelete(user.id)}
                          >
                            Удалить
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      )}
      {message ? <Alert sx={{ mt: 2 }}>{message}</Alert> : null}
      {error ? (
        <Alert sx={{ mt: 2 }} severity="error">
          {error}
        </Alert>
      ) : null}
    </Container>
  );
}
