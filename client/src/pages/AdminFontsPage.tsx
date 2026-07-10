import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { AdminFontUploadForm } from "../components/admin/AdminFontUploadForm";
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { groupFontsByFamily, type AdminFontEntry } from "../features/admin/fontPickerUtils";
import { useAdminFontLibrary } from "../features/admin/useAdminFontLibrary";
import { useAdminAuth } from "../hooks/useAdminAuth";

export function AdminFontsPage() {
  const { isAuth, authChecked, admin, checkSession } = useAdminAuth();
  const { availableFonts, setAvailableFonts, loadFontLibrary } = useAdminFontLibrary();
  const [message, setMessage] = useState("");

  const fontFamilyGroups = useMemo(() => {
    const grouped = groupFontsByFamily(availableFonts);
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ru"))
      .map(([family, faces]) => ({
        family,
        kind: faces.some((face) => face.kind === "variable")
          ? ("variable" as const)
          : ("static" as const),
        faces: [...faces].sort((a, b) => a.fileName?.localeCompare(b.fileName ?? "", "ru") ?? 0),
      }));
  }, [availableFonts]);

  const reloadFonts = useCallback(async () => {
    await loadFontLibrary({ force: true });
  }, [loadFontLibrary]);

  useEffect(() => {
    document.title = "Админ: шрифты";
    checkSession().then((ok) => {
      if (ok) void reloadFonts();
    });
  }, [checkSession, reloadFonts]);

  const deleteFont = useCallback(
    async (font: AdminFontEntry) => {
      if (!window.confirm(`Удалить файл «${font.fileName || font.family}»?`)) return;
      const response = await fetch(`${API_BASE}/api/admin/fonts/${encodeURIComponent(font.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Не удалось удалить шрифт");
        return;
      }
      setMessage("");
      await reloadFonts();
    },
    [reloadFonts],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav canManageAdmins={admin?.role === "SUPER_ADMIN"} />
      <Typography variant="h4" gutterBottom>
        Админка: шрифты
      </Typography>
      {!authChecked ? null : !isAuth ? (
        <AdminLoginForm onSuccess={() => checkSession().then(() => reloadFonts())} />
      ) : (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <AdminFontUploadForm
                onUploaded={(fonts) => {
                  setAvailableFonts((prev) => {
                    const merged = [
                      ...fonts,
                      ...prev.filter((item) => !fonts.some((f) => f.id === item.id)),
                    ];
                    return merged;
                  });
                  void reloadFonts();
                }}
                onError={setMessage}
              />
            </CardContent>
          </Card>
          {message ? <Alert severity="error">{message}</Alert> : null}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Каталог шрифтов
              </Typography>
              {fontFamilyGroups.length === 0 ? (
                <Typography color="text.secondary">Пока нет загруженных шрифтов.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Семейство</TableCell>
                      <TableCell>Режим</TableCell>
                      <TableCell>Файл</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fontFamilyGroups.map((group) =>
                      group.faces.map((font, faceIndex) => {
                        const isLastInGroup = faceIndex === group.faces.length - 1;
                        return (
                          <TableRow
                            key={font.id}
                            hover
                            sx={
                              isLastInGroup && fontFamilyGroups.length > 1
                                ? { "& td": { borderBottomWidth: 2, borderBottomColor: "divider" } }
                                : undefined
                            }
                          >
                            {faceIndex === 0 ? (
                              <TableCell
                                rowSpan={group.faces.length}
                                sx={{ verticalAlign: "top", fontWeight: 600 }}
                              >
                                {group.family}
                                {group.faces.length > 1 ? (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mt: 0.25, fontWeight: 400 }}
                                  >
                                    {group.faces.length} начерт.
                                  </Typography>
                                ) : null}
                              </TableCell>
                            ) : null}
                            {faceIndex === 0 ? (
                              <TableCell rowSpan={group.faces.length} sx={{ verticalAlign: "top" }}>
                                {group.kind === "variable" ? "вариативный" : "static"}
                              </TableCell>
                            ) : null}
                            <TableCell>{font.fileName || "—"}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                aria-label={`Удалить ${font.fileName || font.family}`}
                                onClick={() => void deleteFont(font)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    )}
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
