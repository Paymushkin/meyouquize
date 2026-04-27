import { useState } from "react";
import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import QRCode from "qrcode";

type Props = {
  editableTitle: string;
  setEditableTitle: (value: string) => void;
  saveQuizTitle: () => void;
  joinUrl: string;
  screenUrl: string;
  showEventTitleOnPlayer: boolean;
  onToggleShowEventTitleOnPlayer: (next: boolean) => void;
};

export function AdminGeneralSection(props: Props) {
  const {
    editableTitle,
    setEditableTitle,
    saveQuizTitle,
    joinUrl,
    screenUrl,
    showEventTitleOnPlayer,
    onToggleShowEventTitleOnPlayer,
  } = props;
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLabel, setQrLabel] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  async function copyToClipboard(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignored: unsupported browser / denied permission
    }
  }

  async function openQr(label: string, value: string) {
    if (!value) return;
    const nextQrData = await QRCode.toDataURL(value, { margin: 1, width: 320 });
    setQrLabel(label);
    setQrDataUrl(nextQrData);
    setQrOpen(true);
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <TextField
            label="Название квиза"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            onBlur={saveQuizTitle}
            fullWidth
            size="small"
            multiline
            minRows={2}
            maxRows={4}
            sx={{ mb: 2 }}
          />
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                Ссылка на ивент
              </Typography>
              <Tooltip title="Скопировать ссылку">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void copyToClipboard(joinUrl)}
                    disabled={!joinUrl}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Показать QR">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void openQr("Ссылка на ивент", joinUrl)}
                    disabled={!joinUrl}
                  >
                    <QrCode2Icon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                Ссылка на проектор
              </Typography>
              <Tooltip title="Скопировать ссылку">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void copyToClipboard(screenUrl)}
                    disabled={!screenUrl}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Показать QR">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void openQr("Ссылка на проектор", screenUrl)}
                    disabled={!screenUrl}
                  >
                    <QrCode2Icon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                checked={showEventTitleOnPlayer}
                onChange={(_, next) => onToggleShowEventTitleOnPlayer(next)}
              />
            }
            label="Показывать название ивента у пользователя"
          />
        </CardContent>
      </Card>
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)}>
        <DialogTitle>{qrLabel}</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", pb: 3 }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="qr-code"
              style={{ width: 320, height: 320, maxWidth: "75vw", maxHeight: "75vw" }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
