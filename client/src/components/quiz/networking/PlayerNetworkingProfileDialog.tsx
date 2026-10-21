import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { NetworkingProfile } from "../../../features/quizPlay/usePlayerNetworking";
import { API_BASE } from "../../../config";
import { getOrCreateDeviceId } from "../../../storage";
import { resolveClientAssetUrl } from "../../../utils/resolveClientAssetUrl";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_TITLE_SX,
  buildPlayerDialogPaperSx,
  buildPlayerDialogTextFieldSx,
} from "../playerDialogStyles";
import { buildBrandPrimaryContainedButtonSx } from "../../../pages/quiz-play/QuizPlayBrandingBlocks";

type Props = {
  open: boolean;
  onClose: () => void;
  quizId: string;
  profile: NetworkingProfile | null;
  onSave: (patch: Partial<NetworkingProfile>) => void;
  brandFontFamily: string;
  brandPrimaryColor: string;
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
};

export function PlayerNetworkingProfileDialog(props: Props) {
  const {
    open,
    onClose,
    quizId,
    profile,
    onSave,
    brandFontFamily,
    brandPrimaryColor,
    formBackgroundColor,
    formTextColor,
    formInputTextColor,
  } = props;
  const [draft, setDraft] = useState<NetworkingProfile>({
    fullName: "",
    company: "",
    avatarUrl: "",
    offers: "",
    seeking: "",
    visibleInDirectory: true,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setAvatarError("");
    setDraft({
      fullName: profile?.fullName ?? "",
      company: profile?.company ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      offers: profile?.offers ?? "",
      seeking: profile?.seeking ?? "",
      visibleInDirectory: profile?.visibleInDirectory ?? true,
    });
  }, [open, profile]);

  async function uploadAvatar(file: File) {
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("quizId", quizId);
      form.append("deviceId", getOrCreateDeviceId());
      const response = await fetch(`${API_BASE}/api/networking/avatar`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Не удалось загрузить фото");
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("Не удалось загрузить фото");
      setDraft((prev) => ({ ...prev, avatarUrl: data.url! }));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const fieldSx = buildPlayerDialogTextFieldSx(
    formBackgroundColor,
    formInputTextColor,
    brandFontFamily,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: buildPlayerDialogPaperSx(brandFontFamily) }}
    >
      <DialogTitle sx={PLAYER_DIALOG_TITLE_SX}>Мой профиль</DialogTitle>
      <DialogContent sx={PLAYER_DIALOG_CONTENT_SX}>
        <Stack spacing={1.5} sx={{ mt: 0.5 }} alignItems="center">
          <Avatar
            src={draft.avatarUrl ? resolveClientAssetUrl(draft.avatarUrl) : undefined}
            sx={{ width: 88, height: 88, bgcolor: "grey.300", fontSize: "1.75rem" }}
          >
            {(draft.fullName.trim() || "?").slice(0, 1).toUpperCase()}
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadAvatar(file);
            }}
          />
          <Button
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingAvatar ? "Загрузка…" : draft.avatarUrl ? "Сменить фото" : "Загрузить фото"}
          </Button>
          {avatarError ? (
            <Typography variant="caption" color="error" textAlign="center">
              {avatarError}
            </Typography>
          ) : null}

          <TextField
            label="ФИО"
            fullWidth
            value={draft.fullName}
            onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
            sx={fieldSx}
          />
          <TextField
            label="Компания"
            fullWidth
            value={draft.company}
            onChange={(e) => setDraft((prev) => ({ ...prev, company: e.target.value }))}
            sx={fieldSx}
          />
          <TextField
            label="Чем полезен"
            fullWidth
            multiline
            minRows={2}
            value={draft.offers}
            onChange={(e) => setDraft((prev) => ({ ...prev, offers: e.target.value }))}
            sx={fieldSx}
          />
          <TextField
            label="Что ищу"
            fullWidth
            multiline
            minRows={2}
            value={draft.seeking}
            onChange={(e) => setDraft((prev) => ({ ...prev, seeking: e.target.value }))}
            sx={fieldSx}
          />
          <FormControlLabel
            sx={{ alignSelf: "stretch", ml: 0 }}
            control={
              <Switch
                checked={draft.visibleInDirectory}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, visibleInDirectory: e.target.checked }))
                }
              />
            }
            label="Показывать в списке гостей"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: formInputTextColor }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          disabled={uploadingAvatar}
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          sx={buildBrandPrimaryContainedButtonSx(brandPrimaryColor, formTextColor)}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
