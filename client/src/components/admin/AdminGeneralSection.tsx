import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
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
  PROJECTOR_BROWSER_ZOOM_MAX,
  PROJECTOR_BROWSER_ZOOM_MIN,
  PROJECTOR_BROWSER_ZOOM_STEP,
  PROJECTOR_CONTENT_MAX_WIDTH_PX_MAX,
  PROJECTOR_CONTENT_MAX_WIDTH_PX_MIN,
  PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH,
  clampProjectorBrowserZoom,
  clampProjectorContentMaxWidthPx,
  type PublicViewSetPatch,
} from "../../publicViewContract";
import {
  DEFAULT_NETWORKING_JOIN_FORM_COPY,
  normalizeNetworkingJoinFormMode,
  normalizeNetworkingPlayerTab,
  type NetworkingJoinFormCopy,
  type NetworkingJoinFormFields,
  type NetworkingJoinFormMode,
  type NetworkingPlayerTab,
} from "@meyouquize/shared";
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
  networkingEnabled: boolean;
  onNetworkingEnabledChange: (enabled: boolean) => void;
  networkingJoinFormMode: NetworkingJoinFormMode;
  onNetworkingJoinFormModeChange: (mode: NetworkingJoinFormMode) => void;
  networkingJoinFormFields: NetworkingJoinFormFields;
  onNetworkingJoinFormFieldsChange: (fields: NetworkingJoinFormFields) => void;
  networkingJoinFormCopy: NetworkingJoinFormCopy;
  onNetworkingJoinFormCopyChange: (copy: NetworkingJoinFormCopy) => void;
  networkingDefaultTab: NetworkingPlayerTab;
  onNetworkingDefaultTabChange: (tab: NetworkingPlayerTab) => void;
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorBrowserZoom: number;
  setProjectorBrowserZoom: (value: number) => void;
  projectorContentMaxWidthPx: number;
  setProjectorContentMaxWidthPx: (value: number) => void;
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
    networkingEnabled,
    onNetworkingEnabledChange,
    networkingJoinFormMode,
    onNetworkingJoinFormModeChange,
    networkingJoinFormFields,
    onNetworkingJoinFormFieldsChange,
    networkingJoinFormCopy,
    onNetworkingJoinFormCopyChange,
    networkingDefaultTab,
    onNetworkingDefaultTabChange,
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorBrowserZoom,
    setProjectorBrowserZoom,
    projectorContentMaxWidthPx,
    setProjectorContentMaxWidthPx,
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
  const [zoomDraft, setZoomDraft] = useState(String(projectorBrowserZoom));
  const [maxWidthDraft, setMaxWidthDraft] = useState(String(projectorContentMaxWidthPx));

  useEffect(() => {
    setZoomDraft(String(projectorBrowserZoom));
  }, [projectorBrowserZoom]);

  useEffect(() => {
    setMaxWidthDraft(String(projectorContentMaxWidthPx));
  }, [projectorContentMaxWidthPx]);

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

  function commitZoom(raw: string) {
    const next = clampProjectorBrowserZoom(raw, projectorBrowserZoom);
    setZoomDraft(String(next));
    if (next === projectorBrowserZoom) return;
    setProjectorBrowserZoom(next);
    emitBrandingPatch({ projectorBrowserZoom: next });
  }

  function commitContentMaxWidth(raw: string) {
    const next = clampProjectorContentMaxWidthPx(raw, projectorContentMaxWidthPx);
    setMaxWidthDraft(String(next));
    if (next === projectorContentMaxWidthPx) return;
    setProjectorContentMaxWidthPx(next);
    emitBrandingPatch({ projectorContentMaxWidthPx: next });
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
                <Typography variant="body2" sx={rowLabelSx}>
                  Масштаб проектора
                </Typography>
                <TextField
                  id="projector-browser-zoom"
                  type="number"
                  size="small"
                  value={zoomDraft}
                  onChange={(e) => setZoomDraft(e.target.value)}
                  onBlur={() => commitZoom(zoomDraft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  inputProps={{
                    min: PROJECTOR_BROWSER_ZOOM_MIN,
                    max: PROJECTOR_BROWSER_ZOOM_MAX,
                    step: PROJECTOR_BROWSER_ZOOM_STEP,
                    "aria-label": "Масштаб проектора",
                  }}
                  sx={{ width: 96 }}
                />
              </Box>
              <Box sx={switchRowSx}>
                <Typography variant="body2" sx={rowLabelSx}>
                  Макс. ширина контейнера, px
                </Typography>
                <TextField
                  id="projector-content-max-width"
                  type="number"
                  size="small"
                  value={maxWidthDraft}
                  onChange={(e) => setMaxWidthDraft(e.target.value)}
                  onBlur={() => commitContentMaxWidth(maxWidthDraft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  inputProps={{
                    min: PROJECTOR_CONTENT_MAX_WIDTH_PX_MIN,
                    max: PROJECTOR_CONTENT_MAX_WIDTH_PX_MAX,
                    step: 10,
                    "aria-label": "Макс. ширина контейнера проектора",
                  }}
                  sx={{ width: 96 }}
                />
              </Box>
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
              <Box sx={switchRowSx}>
                <Typography variant="body2">Нетворкинг</Typography>
                <Switch
                  checked={networkingEnabled}
                  onChange={(_, next) => onNetworkingEnabledChange(next)}
                />
              </Box>
              {networkingEnabled ? (
                <FormControl component="fieldset" sx={{ display: "block", pt: 0.5 }}>
                  <FormLabel component="legend" sx={{ mb: 0.75, typography: "body2" }}>
                    Форма входа
                  </FormLabel>
                  <RadioGroup
                    value={networkingJoinFormMode}
                    onChange={(e) => {
                      onNetworkingJoinFormModeChange(
                        normalizeNetworkingJoinFormMode(e.target.value),
                      );
                    }}
                  >
                    <FormControlLabel
                      value="interactive"
                      control={<Radio size="small" />}
                      label="Для интерактивов (ник + случайное)"
                    />
                    <FormControlLabel
                      value="networking"
                      control={<Radio size="small" />}
                      label="Для нетворкинга (ФИО + поля)"
                    />
                    <FormControlLabel
                      value="pharma"
                      control={<Radio size="small" />}
                      label="Для фармы (ФИО, должность, номер аптеки)"
                    />
                  </RadioGroup>
                  {networkingJoinFormMode === "networking" ? (
                    <Stack spacing={1} sx={{ mt: 1, pl: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Поля формы (ФИО всегда)
                      </Typography>
                      <Box sx={switchRowSx}>
                        <Typography variant="body2">Компания</Typography>
                        <Switch
                          size="small"
                          checked={networkingJoinFormFields.company}
                          onChange={(_, checked) =>
                            onNetworkingJoinFormFieldsChange({
                              ...networkingJoinFormFields,
                              company: checked,
                              companyRequired: checked
                                ? networkingJoinFormFields.companyRequired
                                : false,
                            })
                          }
                        />
                      </Box>
                      {networkingJoinFormFields.company ? (
                        <Box sx={{ ...switchRowSx, pl: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Обязательное
                          </Typography>
                          <Switch
                            size="small"
                            checked={networkingJoinFormFields.companyRequired}
                            onChange={(_, checked) =>
                              onNetworkingJoinFormFieldsChange({
                                ...networkingJoinFormFields,
                                companyRequired: checked,
                              })
                            }
                          />
                        </Box>
                      ) : null}
                      <Box sx={switchRowSx}>
                        <Typography variant="body2">Полезен</Typography>
                        <Switch
                          size="small"
                          checked={networkingJoinFormFields.offers}
                          onChange={(_, checked) =>
                            onNetworkingJoinFormFieldsChange({
                              ...networkingJoinFormFields,
                              offers: checked,
                              offersRequired: checked
                                ? networkingJoinFormFields.offersRequired
                                : false,
                            })
                          }
                        />
                      </Box>
                      {networkingJoinFormFields.offers ? (
                        <Stack spacing={1} sx={{ pl: 0.5 }}>
                          <Box sx={switchRowSx}>
                            <Typography variant="body2" color="text.secondary">
                              Обязательное
                            </Typography>
                            <Switch
                              size="small"
                              checked={networkingJoinFormFields.offersRequired}
                              onChange={(_, checked) =>
                                onNetworkingJoinFormFieldsChange({
                                  ...networkingJoinFormFields,
                                  offersRequired: checked,
                                })
                              }
                            />
                          </Box>
                          <TextField
                            size="small"
                            label="Название поля"
                            value={networkingJoinFormCopy.offersLabel}
                            placeholder={DEFAULT_NETWORKING_JOIN_FORM_COPY.offersLabel}
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                offersLabel: e.target.value,
                              })
                            }
                            onBlur={() =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                offersLabel:
                                  networkingJoinFormCopy.offersLabel.trim() ||
                                  DEFAULT_NETWORKING_JOIN_FORM_COPY.offersLabel,
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Подсказка в поле"
                            value={networkingJoinFormCopy.offersPlaceholder}
                            placeholder="Например: могу помочь с …"
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                offersPlaceholder: e.target.value,
                              })
                            }
                          />
                        </Stack>
                      ) : null}
                      <Box sx={switchRowSx}>
                        <Typography variant="body2">Ищу</Typography>
                        <Switch
                          size="small"
                          checked={networkingJoinFormFields.seeking}
                          onChange={(_, checked) =>
                            onNetworkingJoinFormFieldsChange({
                              ...networkingJoinFormFields,
                              seeking: checked,
                              seekingRequired: checked
                                ? networkingJoinFormFields.seekingRequired
                                : false,
                            })
                          }
                        />
                      </Box>
                      {networkingJoinFormFields.seeking ? (
                        <Stack spacing={1} sx={{ pl: 0.5 }}>
                          <Box sx={switchRowSx}>
                            <Typography variant="body2" color="text.secondary">
                              Обязательное
                            </Typography>
                            <Switch
                              size="small"
                              checked={networkingJoinFormFields.seekingRequired}
                              onChange={(_, checked) =>
                                onNetworkingJoinFormFieldsChange({
                                  ...networkingJoinFormFields,
                                  seekingRequired: checked,
                                })
                              }
                            />
                          </Box>
                          <TextField
                            size="small"
                            label="Название поля"
                            value={networkingJoinFormCopy.seekingLabel}
                            placeholder={DEFAULT_NETWORKING_JOIN_FORM_COPY.seekingLabel}
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                seekingLabel: e.target.value,
                              })
                            }
                            onBlur={() =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                seekingLabel:
                                  networkingJoinFormCopy.seekingLabel.trim() ||
                                  DEFAULT_NETWORKING_JOIN_FORM_COPY.seekingLabel,
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Подсказка в поле"
                            value={networkingJoinFormCopy.seekingPlaceholder}
                            placeholder="Например: ищу партнёра по …"
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                seekingPlaceholder: e.target.value,
                              })
                            }
                          />
                        </Stack>
                      ) : null}
                      <Box sx={switchRowSx}>
                        <Typography variant="body2">Телефон</Typography>
                        <Switch
                          size="small"
                          checked={networkingJoinFormFields.phone}
                          onChange={(_, checked) =>
                            onNetworkingJoinFormFieldsChange({
                              ...networkingJoinFormFields,
                              phone: checked,
                              phoneRequired: checked
                                ? networkingJoinFormFields.phoneRequired
                                : false,
                            })
                          }
                        />
                      </Box>
                      {networkingJoinFormFields.phone ? (
                        <Box sx={{ ...switchRowSx, pl: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Обязательное
                          </Typography>
                          <Switch
                            size="small"
                            checked={networkingJoinFormFields.phoneRequired}
                            onChange={(_, checked) =>
                              onNetworkingJoinFormFieldsChange({
                                ...networkingJoinFormFields,
                                phoneRequired: checked,
                              })
                            }
                          />
                        </Box>
                      ) : null}
                      <Box sx={switchRowSx}>
                        <Typography variant="body2">Почта</Typography>
                        <Switch
                          size="small"
                          checked={networkingJoinFormFields.email}
                          onChange={(_, checked) =>
                            onNetworkingJoinFormFieldsChange({
                              ...networkingJoinFormFields,
                              email: checked,
                              emailRequired: checked
                                ? networkingJoinFormFields.emailRequired
                                : false,
                            })
                          }
                        />
                      </Box>
                      {networkingJoinFormFields.email ? (
                        <Box sx={{ ...switchRowSx, pl: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Обязательное
                          </Typography>
                          <Switch
                            size="small"
                            checked={networkingJoinFormFields.emailRequired}
                            onChange={(_, checked) =>
                              onNetworkingJoinFormFieldsChange({
                                ...networkingJoinFormFields,
                                emailRequired: checked,
                              })
                            }
                          />
                        </Box>
                      ) : null}
                      <TextField
                        size="small"
                        label="Ссылка на документ обработки ПД"
                        value={networkingJoinFormCopy.privacyPolicyUrl}
                        placeholder="https://…"
                        helperText={
                          networkingJoinFormCopy.privacyPolicyUrl.trim()
                            ? "На форме входа: «Нажимая кнопку „Войти“ вы соглашаетесь на обработку персональных данных»"
                            : "Пусто — согласие на форме не показывается"
                        }
                        onChange={(e) =>
                          onNetworkingJoinFormCopyChange({
                            ...networkingJoinFormCopy,
                            privacyPolicyUrl: e.target.value,
                          })
                        }
                        onBlur={() =>
                          onNetworkingJoinFormCopyChange({
                            ...networkingJoinFormCopy,
                            privacyPolicyUrl: networkingJoinFormCopy.privacyPolicyUrl.trim(),
                          })
                        }
                      />
                    </Stack>
                  ) : null}
                </FormControl>
              ) : null}
              {networkingEnabled ? (
                <FormControl component="fieldset" sx={{ display: "block", pt: 0.5 }}>
                  <FormLabel component="legend" sx={{ mb: 0.75, typography: "body2" }}>
                    Вкладка по умолчанию
                  </FormLabel>
                  <RadioGroup
                    row
                    value={networkingDefaultTab}
                    onChange={(e) => {
                      onNetworkingDefaultTabChange(normalizeNetworkingPlayerTab(e.target.value));
                    }}
                  >
                    <FormControlLabel value="feed" control={<Radio size="small" />} label="Лента" />
                    <FormControlLabel
                      value="guests"
                      control={<Radio size="small" />}
                      label="Гости"
                    />
                    <FormControlLabel value="chats" control={<Radio size="small" />} label="Чаты" />
                  </RadioGroup>
                </FormControl>
              ) : null}
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
