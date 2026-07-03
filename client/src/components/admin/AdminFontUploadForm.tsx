import { useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { API_BASE } from "../../config";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";
import type { AdminFontEntry } from "../../features/admin/useAdminFontLibrary";

type Props = {
  onUploaded: (fonts: AdminFontEntry[]) => void;
  onError: (message: string) => void;
};

export function AdminFontUploadForm({ onUploaded, onError }: Props) {
  const [family, setFamily] = useState("");
  const [mode, setMode] = useState<"variable" | "static">("static");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(files: File[]) {
    const trimmedFamily = family.trim();
    if (!trimmedFamily) {
      onError("Укажите семейство для загрузки");
      return;
    }
    if (!files.length) return;
    if (mode === "variable" && files.length > 1) {
      onError("Вариативный шрифт — только один файл");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("family", trimmedFamily);
      form.append("kind", mode);
      const response = await fetch(`${API_BASE}/api/admin/fonts/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        fonts?: AdminFontEntry[];
      };
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить шрифт");
      }
      const normalized = (payload.fonts ?? []).map((font) => ({
        ...font,
        url: resolveClientAssetUrl(font.url),
        kind: font.kind === "variable" ? ("variable" as const) : ("static" as const),
      }));
      onUploaded(normalized);
      setMessage(
        mode === "variable"
          ? "Вариативный шрифт загружен"
          : `Загружено начертаний: ${normalized.length}`,
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Ошибка загрузки шрифта");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Загрузить шрифт</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Семейство"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="Например: Styrene A"
          sx={{ minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          label="Режим"
          value={mode}
          onChange={(e) => setMode(e.target.value === "variable" ? "variable" : "static")}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="variable">Вариативный (1 файл)</MenuItem>
          <MenuItem value="static">Набор начертаний (несколько файлов)</MenuItem>
        </TextField>
        <Box>
          <input
            id="admin-font-upload"
            type="file"
            multiple={mode === "static"}
            accept=".woff2,font/woff2"
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = "";
              void handleUpload(files);
            }}
          />
          <label htmlFor="admin-font-upload">
            <Button component="span" variant="outlined" disabled={uploading}>
              {uploading ? "Загрузка…" : "Выбрать файлы"}
            </Button>
          </label>
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {mode === "variable"
          ? "Один .woff2 с осями веса. Заменит все static-начертания этого семейства."
          : "Можно выбрать несколько .woff2 (Regular, Bold, Italic и т.д.) для одного семейства."}
      </Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
    </Stack>
  );
}
