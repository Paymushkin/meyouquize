import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AVATAR_EXPORT_SIZE,
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  clampAvatarCropOffset,
  drawAvatarCropToCanvas,
  exportAvatarJpeg,
  loadOrientedImageBitmap,
  scaleCropView,
  type AvatarCropView,
} from "../../../features/quizPlay/avatarCrop";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_TITLE_SX,
  buildPlayerDialogPaperSx,
} from "../playerDialogStyles";
import { buildBrandPrimaryContainedButtonSx } from "../../../pages/quiz-play/QuizPlayBrandingBlocks";

const PREVIEW_SIZE = 240;

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (file: File) => void;
  brandFontFamily: string;
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
};

export function NetworkingAvatarCropDialog({
  open,
  file,
  onClose,
  onConfirm,
  brandFontFamily,
  formBackgroundColor,
  formTextColor,
  formInputTextColor,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [view, setView] = useState<AvatarCropView>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError("");
    setView({ zoom: 1, offsetX: 0, offsetY: 0 });
    void loadOrientedImageBitmap(file)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = bitmap;
        setReady(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Не удалось открыть фото");
        setReady(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
      setReady(false);
    };
  }, [open, file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawAvatarCropToCanvas(ctx, bitmap, PREVIEW_SIZE, view);
  }, [view, ready]);

  function updateView(next: AvatarCropView) {
    const bitmap = bitmapRef.current;
    if (!bitmap) {
      setView(next);
      return;
    }
    const clamped = clampAvatarCropOffset(
      bitmap.width,
      bitmap.height,
      PREVIEW_SIZE,
      next.zoom,
      next.offsetX,
      next.offsetY,
    );
    setView({ zoom: next.zoom, ...clamped });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: view.offsetX, oy: view.offsetY };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    updateView({
      zoom: view.zoom,
      offsetX: drag.ox + (e.clientX - drag.x),
      offsetY: drag.oy + (e.clientY - drag.y),
    });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  async function handleConfirm() {
    const bitmap = bitmapRef.current;
    if (!bitmap) return;
    setExporting(true);
    setError("");
    try {
      const exportView = scaleCropView(view, PREVIEW_SIZE, AVATAR_EXPORT_SIZE);
      const blob = await exportAvatarJpeg(bitmap, exportView);
      const out = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onConfirm(out);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обрезать фото");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={exporting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: buildPlayerDialogPaperSx(brandFontFamily) }}
    >
      <DialogTitle sx={PLAYER_DIALOG_TITLE_SX}>Фото профиля</DialogTitle>
      <DialogContent sx={PLAYER_DIALOG_CONTENT_SX}>
        <Stack spacing={2} alignItems="center" sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Перетащите фото и выберите масштаб — так оно будет в профиле
          </Typography>
          <Box
            sx={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              borderRadius: "50%",
              overflow: "hidden",
              bgcolor: "grey.200",
              position: "relative",
              touchAction: "none",
              cursor: loading ? "default" : "grab",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.08)",
            }}
          >
            {loading ? (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : (
              <canvas
                ref={canvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, display: "block" }}
              />
            )}
          </Box>
          <Box sx={{ width: "100%", px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Масштаб
            </Typography>
            <Slider
              value={view.zoom}
              min={AVATAR_ZOOM_MIN}
              max={AVATAR_ZOOM_MAX}
              step={0.01}
              disabled={loading || exporting || !ready}
              onChange={(_, value) => {
                const zoom = Array.isArray(value) ? value[0]! : value;
                updateView({ ...view, zoom });
              }}
              sx={{ color: formBackgroundColor }}
            />
          </Box>
          {error ? (
            <Typography variant="caption" color="error" textAlign="center">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={exporting} sx={{ color: formInputTextColor }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          disabled={loading || exporting || !ready || !!error}
          onClick={() => void handleConfirm()}
          sx={buildBrandPrimaryContainedButtonSx(formBackgroundColor, formTextColor)}
        >
          {exporting ? (
            <CircularProgress size={18} thickness={5} sx={{ color: formTextColor }} />
          ) : (
            "Готово"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
