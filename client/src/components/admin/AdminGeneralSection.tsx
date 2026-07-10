import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import QRCode from "qrcode";
import { buildPlayerJoinUrl, buildProjectorScreenUrl } from "../../publicAppOrigin";
import {
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  type PublicViewSetPatch,
} from "../../publicViewContract";
import { CompactColorField } from "./branding/CompactColorField";

type Props = {
  editableTitle: string;
  setEditableTitle: (value: string) => void;
  saveQuizTitle: () => void;
  eventSlug: string;
  showEventTitleOnPlayer: boolean;
  onToggleShowEventTitleOnPlayer: (next: boolean) => void;
  playerAutoJoinRandomNickname: boolean;
  onTogglePlayerAutoJoinRandomNickname: (next: boolean) => void;
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
};

export function AdminGeneralSection(props: Props) {
  const {
    editableTitle,
    setEditableTitle,
    saveQuizTitle,
    eventSlug,
    showEventTitleOnPlayer,
    onToggleShowEventTitleOnPlayer,
    playerAutoJoinRandomNickname,
    onTogglePlayerAutoJoinRandomNickname,
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    emitBrandingPatch,
  } = props;
  const switchRowSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
  } as const;
  const rowLabelSx = { flex: 1, minWidth: 0 } as const;
  const joinUrl = buildPlayerJoinUrl(eventSlug);
  const screenUrl = buildProjectorScreenUrl(eventSlug);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLabel, setQrLabel] = useState("");
  const [qrTargetUrl, setQrTargetUrl] = useState("");
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
    setQrTargetUrl(value);
    setQrDataUrl(nextQrData);
    setQrOpen(true);
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
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
            />
            <TextField
              label="Текст рядом с QR"
              placeholder={DEFAULT_PROJECTOR_JOIN_QR_TEXT}
              value={projectorJoinQrText}
              onChange={(e) => setProjectorJoinQrText(e.target.value)}
              onBlur={() => emitBrandingPatch({ projectorJoinQrText })}
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={5}
              inputProps={{ maxLength: PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH }}
            />
            <CompactColorField
              label="Цвет текста"
              value={projectorJoinQrTextColor}
              onChange={setProjectorJoinQrTextColor}
              onBlur={() => emitBrandingPatch({ projectorJoinQrTextColor })}
            />
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" sx={rowLabelSx}>
                  Ивент
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
                      onClick={() => void openQr("Ссылка на ивент", buildPlayerJoinUrl(eventSlug))}
                      disabled={!eventSlug}
                    >
                      <QrCode2Icon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Открыть в новой вкладке">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (joinUrl) window.open(joinUrl, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!joinUrl}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" sx={rowLabelSx}>
                  Проектор
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
                      onClick={() =>
                        void openQr("Ссылка на проектор", buildProjectorScreenUrl(eventSlug))
                      }
                      disabled={!eventSlug}
                    >
                      <QrCode2Icon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Открыть в новой вкладке">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (screenUrl) window.open(screenUrl, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!screenUrl}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
            <Stack spacing={1}>
              <Box sx={switchRowSx}>
                <Typography variant="body2">Показывать название ивента у пользователя</Typography>
                <Switch
                  checked={showEventTitleOnPlayer}
                  onChange={(_, next) => onToggleShowEventTitleOnPlayer(next)}
                />
              </Box>
              <Box sx={switchRowSx}>
                <Typography variant="body2">Вход без формы: сразу случайное имя</Typography>
                <Switch
                  checked={playerAutoJoinRandomNickname}
                  onChange={(_, next) => onTogglePlayerAutoJoinRandomNickname(next)}
                />
              </Box>
              <Box sx={switchRowSx}>
                <Typography variant="body2">Показывать QR-код на экране ивента</Typography>
                <Switch
                  checked={projectorJoinQrVisible}
                  onChange={(_, next) => {
                    setProjectorJoinQrVisible(next);
                    emitBrandingPatch({ projectorJoinQrVisible: next });
                  }}
                />
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)}>
        <DialogTitle>{qrLabel}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", pb: 3 }}
        >
          {qrTargetUrl ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1.5, textAlign: "center", wordBreak: "break-all" }}
            >
              {qrTargetUrl}
            </Typography>
          ) : null}
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR-код входа в ивент"
              style={{ width: 320, height: 320, maxWidth: "75vw", maxHeight: "75vw" }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
