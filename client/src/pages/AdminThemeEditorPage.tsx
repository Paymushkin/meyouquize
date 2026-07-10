import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Container, Stack, TextField, Typography } from "@mui/material";
import type { EventThemeBranding } from "@meyouquize/shared";
import { isSystemEventThemeId } from "@meyouquize/shared";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";
import { AdminGlobalNav } from "../components/admin/AdminGlobalNav";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { useAdminBrandingProps } from "../hooks/useAdminBrandingProps";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAdminFontLibrary } from "../features/admin/useAdminFontLibrary";
import { useBrandingEditorState } from "../features/branding/useBrandingEditorState";
import { parseApiErrorMessage } from "../utils/apiError";
import { buildBrandFontFacesForFamily, useBrandFont } from "../hooks/useBrandFont";

export function AdminThemeEditorPage() {
  const { themeId = "new" } = useParams();
  const navigate = useNavigate();
  const isNew = themeId === "new";
  const isSystemTheme = isSystemEventThemeId(themeId);
  const { isAuth, authChecked, checkSession } = useAdminAuth();
  const editor = useBrandingEditorState();
  const { availableFonts, setAvailableFonts, loadFontLibrary } = useAdminFontLibrary();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTheme = useCallback(async () => {
    if (isNew) return;
    const response = await fetch(
      `${API_BASE}/api/admin/event-themes/${encodeURIComponent(themeId)}`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      setMessage("Тема не найдена");
      return;
    }
    const payload = (await response.json()) as {
      name: string;
      branding: EventThemeBranding;
      system?: boolean;
    };
    setName(payload.name);
    editor.applyFromEventThemeBranding(payload.branding);
  }, [editor.applyFromEventThemeBranding, isNew, themeId]);

  useEffect(() => {
    document.title = isNew ? "Новая тема" : "Редактор темы";
    checkSession().then((ok) => {
      if (!ok) return;
      void loadFontLibrary();
      void loadTheme();
    });
  }, [checkSession, isNew, loadFontLibrary, loadTheme]);

  async function uploadBannerMedia(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/api/admin/media/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(parseApiErrorMessage(payload, "Не удалось загрузить файл"));
    }
    const payload = (await response.json()) as { url: string };
    if (!payload?.url) throw new Error("Сервер не вернул URL файла");
    return payload.url;
  }

  async function saveTheme() {
    const trimmedName = name.trim();
    if (!isSystemTheme && !trimmedName) {
      setMessage("Укажите название темы");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const branding = editor.toEventThemeBranding();
      const response = await fetch(
        isNew
          ? `${API_BASE}/api/admin/event-themes`
          : `${API_BASE}/api/admin/event-themes/${encodeURIComponent(themeId)}`,
        {
          method: isNew ? "POST" : "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(isSystemTheme ? { branding } : { name: trimmedName, branding }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.error === "Theme name already exists") {
          throw new Error("Тема с таким названием уже существует");
        }
        throw new Error(parseApiErrorMessage(payload, "Не удалось сохранить тему"));
      }
      if (isNew && payload?.id) {
        navigate(`/admin/themes/${payload.id}`, { replace: true });
        return;
      }
      setMessage("Тема сохранена");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить тему");
    } finally {
      setSaving(false);
    }
  }

  const brandFontFaces = useMemo(
    () =>
      buildBrandFontFacesForFamily(editor.brandFontFamily, editor.brandFontUrls, availableFonts),
    [availableFonts, editor.brandFontFamily, editor.brandFontUrls],
  );
  useBrandFont(editor.brandFontFamily, editor.brandFontUrl, editor.brandFontUrls, brandFontFaces);

  const brandingProps = useAdminBrandingProps({
    brandTheme: editor.brandTheme,
    onBrandThemeChange: editor.applyBrandThemeLocally,
    projectorBackground: editor.projectorBackground,
    setProjectorBackground: editor.setProjectorBackground,
    brandBodyBackgroundColor: editor.brandBodyBackgroundColor,
    setBrandBodyBackgroundColor: editor.setBrandBodyBackgroundColor,
    voteQuestionTextColor: editor.voteQuestionTextColor,
    setVoteQuestionTextColor: editor.setVoteQuestionTextColor,
    voteOptionTextColor: editor.voteOptionTextColor,
    setVoteOptionTextColor: editor.setVoteOptionTextColor,
    voteOptionBorderColor: editor.voteOptionBorderColor,
    setVoteOptionBorderColor: editor.setVoteOptionBorderColor,
    voteProgressTrackColor: editor.voteProgressTrackColor,
    setVoteProgressTrackColor: editor.setVoteProgressTrackColor,
    voteProgressBarColor: editor.voteProgressBarColor,
    setVoteProgressBarColor: editor.setVoteProgressBarColor,
    playerVoteOptionTextColor: editor.playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor: editor.setPlayerVoteOptionTextColor,
    playerVoteProgressBarColor: editor.playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor: editor.setPlayerVoteProgressBarColor,
    projectorJoinQrOverlayVisible: editor.projectorJoinQrOverlayVisible,
    setProjectorJoinQrOverlayVisible: editor.setProjectorJoinQrOverlayVisible,
    projectorJoinQrOverlaySizePx: editor.projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx: editor.setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetVerticalPx: editor.projectorJoinQrOverlayInsetVerticalPx,
    setProjectorJoinQrOverlayInsetVerticalPx: editor.setProjectorJoinQrOverlayInsetVerticalPx,
    projectorJoinQrOverlayInsetHorizontalPx: editor.projectorJoinQrOverlayInsetHorizontalPx,
    setProjectorJoinQrOverlayInsetHorizontalPx: editor.setProjectorJoinQrOverlayInsetHorizontalPx,
    projectorJoinQrOverlayCorner: editor.projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner: editor.setProjectorJoinQrOverlayCorner,
    cloudQuestionColor: editor.cloudQuestionColor,
    setCloudQuestionColor: editor.setCloudQuestionColor,
    cloudTopTagColor: editor.cloudTopTagColor,
    setCloudTopTagColor: editor.setCloudTopTagColor,
    cloudCorrectTagColor: editor.cloudCorrectTagColor,
    setCloudCorrectTagColor: editor.setCloudCorrectTagColor,
    cloudTagColors: editor.cloudTagColors,
    setCloudTagColors: editor.setCloudTagColors,
    cloudDensity: editor.cloudDensity,
    setCloudDensity: editor.setCloudDensity,
    cloudTagPadding: editor.cloudTagPadding,
    setCloudTagPadding: editor.setCloudTagPadding,
    cloudSpiral: editor.cloudSpiral,
    setCloudSpiral: editor.setCloudSpiral,
    cloudAnimationStrength: editor.cloudAnimationStrength,
    setCloudAnimationStrength: editor.setCloudAnimationStrength,
    brandPrimaryColor: editor.brandPrimaryColor,
    setBrandPrimaryColor: editor.setBrandPrimaryColor,
    brandAccentColor: editor.brandAccentColor,
    setBrandAccentColor: editor.setBrandAccentColor,
    brandSurfaceColor: editor.brandSurfaceColor,
    setBrandSurfaceColor: editor.setBrandSurfaceColor,
    brandTextColor: editor.brandTextColor,
    setBrandTextColor: editor.setBrandTextColor,
    brandInputTextColor: editor.brandInputTextColor,
    setBrandInputTextColor: editor.setBrandInputTextColor,
    brandFontFamily: editor.brandFontFamily,
    setBrandFontFamily: editor.setBrandFontFamily,
    setBrandFontUrl: editor.setBrandFontUrl,
    setBrandFontUrls: editor.setBrandFontUrls,
    availableFonts,
    onUploadMediaError: setMessage,
    brandLogoUrl: editor.brandLogoUrl,
    setBrandLogoUrl: editor.setBrandLogoUrl,
    brandPlayerBackgroundImageUrl: editor.brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl: editor.setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: editor.brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl: editor.setBrandProjectorBackgroundImageUrl,
    onUploadMedia: uploadBannerMedia,
    emitBrandingPatch: () => {},
    tileColorsProps: {
      speakerTileBackgroundColor: editor.speakerTileBackgroundColor,
      setSpeakerTileBackgroundColor: editor.setSpeakerTileBackgroundColor,
      speakerTileTextColor: editor.speakerTileTextColor,
      setSpeakerTileTextColor: editor.setSpeakerTileTextColor,
      programTileBackgroundColor: editor.programTileBackgroundColor,
      setProgramTileBackgroundColor: editor.setProgramTileBackgroundColor,
      programTileTextColor: editor.programTileTextColor,
      setProgramTileTextColor: editor.setProgramTileTextColor,
    },
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminGlobalNav />
      <Typography variant="h4" gutterBottom>
        {isNew ? "Новая тема" : isSystemTheme ? "Системная тема" : "Редактор темы"}
      </Typography>
      {!authChecked ? null : !isAuth ? (
        <AdminLoginForm onSuccess={() => checkSession()} />
      ) : (
        <Stack spacing={2}>
          {isSystemTheme ? (
            <Typography color="text.secondary">{name}</Typography>
          ) : (
            <TextField
              label="Название темы"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
            />
          )}
          <AdminBrandingSection {...brandingProps} hideThemePicker />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={saving} onClick={() => void saveTheme()}>
              Сохранить
            </Button>
            <Button component={RouterLink} to="/admin/themes">
              К списку тем
            </Button>
          </Stack>
          {message ? (
            <Alert severity={message === "Тема сохранена" ? "success" : "error"}>{message}</Alert>
          ) : null}
        </Stack>
      )}
    </Container>
  );
}
