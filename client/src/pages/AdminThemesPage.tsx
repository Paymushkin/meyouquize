import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { useAdminAuth } from "../hooks/useAdminAuth";

type ThemeListItem = {
  id: string;
  name: string;
  updatedAt: string | null;
  system: boolean;
};

export function AdminThemesPage() {
  const navigate = useNavigate();
  const { isAuth, authChecked, admin, checkSession } = useAdminAuth();
  const [themes, setThemes] = useState<ThemeListItem[]>([]);
  const [message, setMessage] = useState("");
  const [confirmDeleteTheme, setConfirmDeleteTheme] = useState<ThemeListItem | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletingTheme, setDeletingTheme] = useState(false);
  const deleteNameMatches =
    confirmDeleteTheme !== null && deleteConfirmName.trim() === confirmDeleteTheme.name;

  function openDeleteThemeDialog(theme: ThemeListItem) {
    setDeleteConfirmName("");
    setConfirmDeleteTheme(theme);
  }

  function closeDeleteThemeDialog() {
    if (deletingTheme) return;
    setConfirmDeleteTheme(null);
    setDeleteConfirmName("");
  }

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

  const confirmDeleteThemeAction = useCallback(async () => {
    if (!confirmDeleteTheme) return;
    setDeletingTheme(true);
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/event-themes/${encodeURIComponent(confirmDeleteTheme.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (response.status === 403) {
        setMessage("Системные темы нельзя удалить");
        closeDeleteThemeDialog();
        return;
      }
      if (!response.ok) {
        setMessage("Не удалось удалить тему");
        closeDeleteThemeDialog();
        return;
      }
      closeDeleteThemeDialog();
      await loadThemes();
    } finally {
      setDeletingTheme(false);
    }
  }, [confirmDeleteTheme]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav canManageAdmins={admin?.role === "SUPER_ADMIN"} />
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
                Темы
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
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Link to={`/admin/themes/${theme.id}`}>{theme.name}</Link>
                            {theme.system ? (
                              <Chip size="small" label="системная" variant="outlined" />
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {theme.updatedAt
                            ? new Date(theme.updatedAt).toLocaleString()
                            : "встроенная"}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            component={Link}
                            to={`/admin/themes/${theme.id}`}
                            sx={{ mr: theme.system ? 0 : 1 }}
                          >
                            Редактировать
                          </Button>
                          {theme.system ? null : (
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Удалить тему ${theme.name}`}
                              onClick={() => openDeleteThemeDialog(theme)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog
            open={confirmDeleteTheme !== null}
            onClose={closeDeleteThemeDialog}
            maxWidth="xs"
            fullWidth
            disableEscapeKeyDown={deletingTheme}
          >
            <DialogTitle>Удалить тему?</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <Typography>
                  Тема «{confirmDeleteTheme?.name}» будет удалена без возможности восстановления.
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Название темы для подтверждения"
                  placeholder={confirmDeleteTheme?.name ?? ""}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  disabled={deletingTheme}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deleteNameMatches && !deletingTheme) {
                      e.preventDefault();
                      void confirmDeleteThemeAction();
                    }
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteThemeDialog} disabled={deletingTheme}>
                Отмена
              </Button>
              <Button
                color="error"
                variant="contained"
                disabled={deletingTheme || !deleteNameMatches}
                onClick={() => void confirmDeleteThemeAction()}
              >
                {deletingTheme ? "Удаление…" : "Удалить"}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      )}
    </Container>
  );
}
