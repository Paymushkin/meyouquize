import { FormEvent, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { API_BASE } from "../config";
import { parseApiErrorMessage } from "../utils/apiError";

type Props = {
  onSuccess: () => void;
};

export function AdminLoginForm({ onSuccess }: Props) {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: login.trim() || "admin", password }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          setMessage("Слишком много попыток входа. Подождите 60 секунд и попробуйте снова.");
          return;
        }
        let details = "";
        try {
          const payload = await response.json();
          details = parseApiErrorMessage(payload, "");
        } catch {
          details = "";
        }
        setMessage(
          details
            ? `Ошибка авторизации (${response.status}): ${details}`
            : `Ошибка авторизации (${response.status})`,
        );
        return;
      }
      setMessage("");
      onSuccess();
    } catch (error) {
      setMessage(
        `Не удалось подключиться к серверу (${API_BASE}). Проверьте сеть/CORS и что backend запущен. ${
          error instanceof Error ? error.message : ""
        }`,
      );
    }
  }

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 520 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Вход в админку</Typography>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                fullWidth
              />
              <TextField
                type="password"
                label="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained">
                Войти
              </Button>
            </Stack>
          </Box>
          {message && <Alert severity="error">{message}</Alert>}
        </Stack>
      </CardContent>
    </Card>
  );
}
