import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { useAdminAuth } from "../hooks/useAdminAuth";

type ThemeListItem = {
  id: string;
  name: string;
  updatedAt: string;
};

export function AdminThemesPage() {
  const navigate = useNavigate();
  const { isAuth, authChecked, checkSession } = useAdminAuth();
  const [themes, setThemes] = useState<ThemeListItem[]>([]);
  const [message, setMessage] = useState("");

  async function loadThemes() {
    const response = await fetch(`${API_BASE}/api/admin/event-themes`, {
      credentials: "include",
    });
    if (!response.ok) return;
    setThemes(await response.json());
  }

  useEffect(() => {
    document.title = "Админ: темы";
    checkSession().then((ok) => {
      if (ok) void loadThemes();
    });
  }, []);

  const deleteTheme = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Удалить тему «${name}»?`)) return;
    const response = await fetch(`${API_BASE}/api/admin/event-themes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setMessage("Не удалось удалить тему");
      return;
    }
    setMessage("");
    await loadThemes();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav />
      <Typography variant="h4" gutterBottom>
        Админка: темы ивента
      </Typography>
      {!authChecked ? null : !isAuth ? (
        <AdminLoginForm onSuccess={() => checkSession().then(() => loadThemes())} />
      ) : (
        <Stack spacing={3}>
          <Box>
            <Button variant="contained" onClick={() => navigate("/admin/themes/new")}>
              Создать тему
            </Button>
          </Box>
          {message ? <Alert severity="error">{message}</Alert> : null}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Сохранённые темы
              </Typography>
              {themes.length === 0 ? (
                <Typography color="text.secondary">Пока тем нет.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Изменена</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {themes.map((theme) => (
                      <TableRow key={theme.id} hover>
                        <TableCell>
                          <Link to={`/admin/themes/${theme.id}`}>{theme.name}</Link>
                        </TableCell>
                        <TableCell>{new Date(theme.updatedAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            component={Link}
                            to={`/admin/themes/${theme.id}`}
                            sx={{ mr: 1 }}
                          >
                            Редактировать
                          </Button>
                          <IconButton
                            size="small"
                            aria-label={`Удалить тему ${theme.name}`}
                            onClick={() => void deleteTheme(theme.id, theme.name)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
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
