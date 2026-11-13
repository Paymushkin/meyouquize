import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
  getNetworkingJoinFieldVisibility,
  networkingJoinFieldPlaceholder,
  validateNetworkingJoinDraft,
  type NetworkingJoinFormCopy,
  type NetworkingJoinFormFields,
  type NetworkingJoinFormMode,
} from "@meyouquize/shared";
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
import { ensureClientCompressedAvatarFile } from "../../../features/quizPlay/avatarCrop";
import { NetworkingAvatarCropDialog } from "./NetworkingAvatarCropDialog";

type ProfileDraftSource = {
  fullName?: string;
  jobTitle?: string;
  company?: string;
  avatarUrl?: string;
  offers?: string;
  seeking?: string;
  phone?: string;
  email?: string;
  visibleInDirectory?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  quizId: string;
  /** Никнейм участника — буква на аватаре, если ФИО пустое (как в списке гостей). */
  nickname: string;
  profile: NetworkingProfile | null;
  /** Fallback, если profile ещё null (например карточка «я» в списке гостей). */
  fallbackProfile?: ProfileDraftSource | null;
  onSave: (patch: Partial<NetworkingProfile>) => void;
  onOpenRefresh?: () => void;
  /** Как форма входа: networking / pharma (interactive — только ФИО). */
  mode?: NetworkingJoinFormMode;
  fields?: NetworkingJoinFormFields;
  copy?: NetworkingJoinFormCopy;
  brandFontFamily: string;
  brandPrimaryColor: string;
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
};

function buildDraft(
  profile: NetworkingProfile | null,
  fallback: ProfileDraftSource | null | undefined,
  nickname: string,
): NetworkingProfile {
  const fullName = profile?.fullName?.trim() || fallback?.fullName?.trim() || nickname.trim() || "";
  return {
    fullName,
    jobTitle: profile?.jobTitle?.trim() || fallback?.jobTitle?.trim() || "",
    company: profile?.company?.trim() || fallback?.company?.trim() || "",
    avatarUrl: profile?.avatarUrl?.trim() || fallback?.avatarUrl?.trim() || "",
    offers: profile?.offers?.trim() || fallback?.offers?.trim() || "",
    seeking: profile?.seeking?.trim() || fallback?.seeking?.trim() || "",
    phone: profile?.phone?.trim() || fallback?.phone?.trim() || "",
    email: profile?.email?.trim() || fallback?.email?.trim() || "",
    visibleInDirectory: profile?.visibleInDirectory ?? fallback?.visibleInDirectory ?? true,
  };
}

export function PlayerNetworkingProfileDialog(props: Props) {
  const {
    open,
    onClose,
    quizId,
    nickname,
    profile,
    fallbackProfile,
    onSave,
    onOpenRefresh,
    mode = "networking",
    fields,
    copy,
    brandFontFamily,
    formBackgroundColor,
    formTextColor,
    formInputTextColor,
  } = props;
  const visibility = getNetworkingJoinFieldVisibility(mode, fields, copy);
  const [draft, setDraft] = useState<NetworkingProfile>(() =>
    buildDraft(profile, fallbackProfile, nickname),
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [formError, setFormError] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTouchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      draftTouchedRef.current = false;
      return;
    }
    setAvatarError("");
    setFormError("");
    draftTouchedRef.current = false;
    setDraft(buildDraft(profile, fallbackProfile, nickname));
    onOpenRefresh?.();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- только при открытии

  useEffect(() => {
    if (!open || draftTouchedRef.current) return;
    setDraft(buildDraft(profile, fallbackProfile, nickname));
  }, [open, profile, fallbackProfile, nickname]);

  async function uploadAvatar(file: File) {
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      // Сжатие только на клиенте (JPEG ≤ ~180KB) — сервер файл не перекодирует.
      const compressed = await ensureClientCompressedAvatarFile(file);
      const form = new FormData();
      form.append("file", compressed);
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
      draftTouchedRef.current = true;
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
  const avatarLetter = (draft.fullName.trim() || nickname.trim() || "?").slice(0, 1).toUpperCase();

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
          <Box sx={{ position: "relative", width: 104, height: 104 }}>
            <Avatar
              src={draft.avatarUrl ? resolveClientAssetUrl(draft.avatarUrl) : undefined}
              imgProps={{
                onError: () => {
                  draftTouchedRef.current = true;
                  setDraft((prev) => (prev.avatarUrl ? { ...prev, avatarUrl: "" } : prev));
                },
              }}
              sx={{ width: 104, height: 104, bgcolor: "grey.300", fontSize: "2rem" }}
            >
              {avatarLetter}
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) {
                  setAvatarError("");
                  setCropFile(file);
                }
              }}
            />
            <IconButton
              aria-label={draft.avatarUrl ? "Сменить фото" : "Загрузить фото"}
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 36,
                height: 36,
                bgcolor: formBackgroundColor,
                color: formTextColor,
                border: "2px solid #fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                "&:hover": { bgcolor: formBackgroundColor, opacity: 0.92 },
                "&.Mui-disabled": {
                  bgcolor: formBackgroundColor,
                  color: formTextColor,
                  opacity: 0.7,
                },
              }}
            >
              {uploadingAvatar ? (
                <CircularProgress size={18} thickness={5} sx={{ color: formTextColor }} />
              ) : (
                <PhotoCameraIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Box>
          {avatarError ? (
            <Typography variant="caption" color="error" textAlign="center">
              {avatarError}
            </Typography>
          ) : null}

          <TextField
            label="ФИО"
            fullWidth
            value={draft.fullName}
            onChange={(e) => {
              draftTouchedRef.current = true;
              setDraft((prev) => ({ ...prev, fullName: e.target.value }));
            }}
            sx={fieldSx}
          />
          {visibility.showJobTitle ? (
            <TextField
              label="Должность"
              fullWidth
              value={draft.jobTitle}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, jobTitle: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {visibility.showCompany ? (
            <TextField
              label={
                visibility.companyRequired
                  ? `${visibility.companyLabel} *`
                  : visibility.companyLabel
              }
              fullWidth
              value={draft.company}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, company: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {visibility.showOffers ? (
            <TextField
              label={
                visibility.offersRequired ? `${visibility.offersLabel} *` : visibility.offersLabel
              }
              placeholder={networkingJoinFieldPlaceholder(
                visibility.offersLabel,
                visibility.offersPlaceholder,
                visibility.offersRequired,
              )}
              fullWidth
              multiline
              minRows={2}
              value={draft.offers}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, offers: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {visibility.showSeeking ? (
            <TextField
              label={
                visibility.seekingRequired
                  ? `${visibility.seekingLabel} *`
                  : visibility.seekingLabel
              }
              placeholder={networkingJoinFieldPlaceholder(
                visibility.seekingLabel,
                visibility.seekingPlaceholder,
                visibility.seekingRequired,
              )}
              fullWidth
              multiline
              minRows={2}
              value={draft.seeking}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, seeking: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {visibility.showPhone ? (
            <TextField
              label={visibility.phoneRequired ? "Телефон *" : "Телефон"}
              fullWidth
              type="tel"
              value={draft.phone}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, phone: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {visibility.showEmail ? (
            <TextField
              label={visibility.emailRequired ? "Почта *" : "Почта"}
              fullWidth
              type="email"
              value={draft.email}
              onChange={(e) => {
                draftTouchedRef.current = true;
                setDraft((prev) => ({ ...prev, email: e.target.value }));
              }}
              sx={fieldSx}
            />
          ) : null}
          {formError ? (
            <Typography variant="body2" color="error">
              {formError}
            </Typography>
          ) : null}
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
            const error = validateNetworkingJoinDraft(
              mode,
              fields ?? DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
              draft,
            );
            if (error) {
              setFormError(error);
              return;
            }
            setFormError("");
            onSave(draft);
            onClose();
          }}
          sx={buildBrandPrimaryContainedButtonSx(formBackgroundColor, formTextColor)}
        >
          Сохранить
        </Button>
      </DialogActions>

      <NetworkingAvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        onClose={() => setCropFile(null)}
        onConfirm={(cropped) => {
          setCropFile(null);
          void uploadAvatar(cropped);
        }}
        brandFontFamily={brandFontFamily}
        formBackgroundColor={formBackgroundColor}
        formTextColor={formTextColor}
        formInputTextColor={formInputTextColor}
      />
    </Dialog>
  );
}
