import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
                <Stack spacing={1}>
                  {fontFamilyGroups.map((group) => (
                    <Accordion
                      key={group.family}
                      disableGutters
                      variant="outlined"
                      sx={{ "&:before": { display: "none" } }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600} sx={{ minWidth: 0, pr: 1 }}>
                          {group.family}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Файл</TableCell>
                              <TableCell align="right">Действия</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.faces.map((font) => (
                              <TableRow key={font.id} hover>
                                <TableCell>{font.fileName || "—"}</TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Удалить ${font.fileName || font.family}`}
                                    onClick={() => void deleteFont(font)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
}
