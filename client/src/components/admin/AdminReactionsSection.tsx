import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ReactionSession } from "../../pages/quiz-play/types";

export type ReactionWidget = {
  id: string;
  title: string;
  reactions: string[];
};

type Props = {
  widgets: ReactionWidget[];
  session: ReactionSession | null;
  widgetStatsById?: Record<string, Record<string, number>>;
  activeWidgetId: string | null;
  projectorWidgetId: string | null;
  projectorMode: boolean;
  overlayText: string;
  setOverlayText: (value: string) => void;
  onCreateWidget: (title: string, reactionsText: string) => void;
  onUpdateWidget: (widgetId: string, title: string, reactionsText: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  onStartWidget: (widget: ReactionWidget) => void;
  onStop: () => void;
  onToggleProjector: (widget: ReactionWidget) => void;
};

export function AdminReactionsSection({
  widgets,
  session,
  widgetStatsById,
  activeWidgetId,
  projectorWidgetId,
  projectorMode,
  overlayText,
  setOverlayText,
  onCreateWidget,
  onUpdateWidget,
  onDeleteWidget,
  onStartWidget,
  onStop,
  onToggleProjector,
}: Props) {
  const formatUserWord = (count: number): string => {
    const n = Math.abs(Math.trunc(count));
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "юзер";
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "юзера";
    return "юзеров";
  };
  const isActive = !!session?.isActive;
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [confirmDeleteWidgetId, setConfirmDeleteWidgetId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("Новый виджет реакций");
  const [newReactionsText, setNewReactionsText] = useState("👍\n👏\n🔥\n🤔");
  const [editTitle, setEditTitle] = useState("");
  const [editReactionsText, setEditReactionsText] = useState("");

  const historyByWidget = useMemo(() => {
    const history = session?.history ?? [];
    const map = new Map<string, typeof history>();
    for (const widget of widgets) {
      const signature = widget.reactions.join("||");
      map.set(
        widget.id,
        history.filter((item) => item.reactions.join("||") === signature),
      );
    }
    return map;
  }, [session?.history, widgets]);

  return (
    <Stack spacing={2}>
      {widgets.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            py: 6,
            px: 2,
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<EmojiEmotionsIcon sx={{ fontSize: 28 }} />}
            onClick={() => setCreateOpen(true)}
            sx={{
              py: 2,
              px: 4,
              fontSize: "1.1rem",
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            реакции
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
            width: "100%",
          }}
        >
          <Button variant="outlined" size="small" onClick={() => setCreateOpen(true)}>
            <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
            реакции
          </Button>
        </Box>
      )}

      {widgets.map((widget) => {
        const isWidgetActive = !!session?.isActive && activeWidgetId === widget.id;
        const isWidgetOnProjector = projectorMode && projectorWidgetId === widget.id;
        return (
          <Card key={widget.id} variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography
                  variant="subtitle2"
                  onClick={() => {
                    setEditingWidgetId(widget.id);
                    setEditTitle(widget.title);
                    setEditReactionsText(widget.reactions.join("\n"));
                    setEditOpen(true);
                  }}
                  sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  {widget.title?.trim() ? widget.title : widget.reactions.join(" ")}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={isWidgetOnProjector ? "Скрыть с экрана" : "Показать на экране"}>
                    <IconButton
                      size="small"
                      color={isWidgetOnProjector ? "primary" : "default"}
                      onClick={() => onToggleProjector(widget)}
                    >
                      {isWidgetOnProjector ? (
                        <SlideshowIcon fontSize="small" />
                      ) : (
                        <SlideshowOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={isWidgetActive ? "Остановить в телефонах" : "Включить в телефонах"}
                  >
                    <IconButton
                      size="small"
                      color={isWidgetActive ? "warning" : "default"}
                      onClick={() => (isWidgetActive ? onStop() : onStartWidget(widget))}
                    >
                      {isWidgetActive ? (
                        <PhoneIphoneIcon fontSize="small" />
                      ) : (
                        <PhoneDisabledIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Итоги виджета">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setExpandedWidgetId((prev) => (prev === widget.id ? null : widget.id))
                      }
                    >
                      {expandedWidgetId === widget.id ? (
                        <SettingsIcon fontSize="small" />
                      ) : (
                        <SettingsOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Реакции: {widget.reactions.join("  ")}
              </Typography>
              <Collapse in={expandedWidgetId === widget.id} timeout="auto" unmountOnExit>
                <Stack spacing={0.6} sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Итоги виджета</Typography>
                  {(() => {
                    const latestHistory = historyByWidget.get(widget.id)?.[0];
                    const participantsTotal =
                      isWidgetActive && session
                        ? session.uniqueReactors
                        : (latestHistory?.uniqueReactors ?? 0);
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Приняли участие пользователей: {participantsTotal}
                      </Typography>
                    );
                  })()}
                  {widget.reactions.map((reaction) => {
                    const currentCount =
                      isWidgetActive && session ? (session.counts[reaction] ?? 0) : 0;
                    const currentUsers =
                      isWidgetActive && session
                        ? (session.uniqueReactorsByReaction?.[reaction] ?? 0)
                        : 0;
                    const latestHistoryCount =
                      historyByWidget.get(widget.id)?.[0]?.counts?.[reaction] ?? 0;
                    const persistedCount = widgetStatsById?.[widget.id]?.[reaction] ?? 0;
                    const latestHistoryUsers =
                      historyByWidget.get(widget.id)?.[0]?.uniqueReactorsByReaction?.[reaction] ??
                      0;
                    const displayCount = isWidgetActive
                      ? currentCount
                      : latestHistoryCount > 0
                        ? latestHistoryCount
                        : persistedCount;
                    const displayUsers = isWidgetActive ? currentUsers : latestHistoryUsers;
                    return (
                      <Typography
                        key={`${widget.id}_${reaction}`}
                        variant="body2"
                        color="text.secondary"
                      >
                        {reaction} — {displayCount} ({displayUsers} {formatUserWord(displayUsers)})
                      </Typography>
                    );
                  })}
                </Stack>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-label="Создание виджета реакций"
      >
        <DialogTitle
          sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 1, px: 1 }}
        >
          <IconButton
            onClick={() => setCreateOpen(false)}
            size="small"
            aria-label="Закрыть без сохранения"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Настройки виджета реакций
            </Typography>
            <TextField
              label="Название виджета"
              size="small"
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <TextField
              label="Эмодзи (по одному в строке)"
              size="small"
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              value={newReactionsText}
              onChange={(e) => setNewReactionsText(e.target.value)}
              helperText="По умолчанию: 👍 / 👏 / 🔥 / 🤔"
            />
            <TextField
              label="Текст по центру экрана"
              size="small"
              fullWidth
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              inputProps={{ maxLength: 120 }}
              helperText="Показывается крупно в режиме реакций"
            />
            <Divider />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1,
            justifyContent: "flex-end",
            flexWrap: "nowrap",
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            onClick={() => {
              onCreateWidget(newTitle, newReactionsText);
              setCreateOpen(false);
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-label="Редактор виджета реакций"
      >
        <DialogTitle
          sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 1, px: 1 }}
        >
          <IconButton
            onClick={() => setEditOpen(false)}
            size="small"
            aria-label="Закрыть без сохранения"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Настройки виджета реакций
            </Typography>
            <TextField
              label="Название виджета"
              size="small"
              fullWidth
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextField
              label="Текст по центру экрана"
              size="small"
              fullWidth
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              inputProps={{ maxLength: 120 }}
              helperText="Показывается крупно в режиме реакций"
            />
            <TextField
              label="Эмодзи (по одному в строке)"
              size="small"
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              value={editReactionsText}
              onChange={(e) => setEditReactionsText(e.target.value)}
            />
            <Divider />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1,
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            sx={{ mr: "auto" }}
            onClick={() => {
              if (!editingWidgetId) return;
              setConfirmDeleteWidgetId(editingWidgetId);
            }}
          >
            Удалить
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingWidgetId) return;
              onUpdateWidget(editingWidgetId, editTitle, editReactionsText);
              setEditOpen(false);
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteWidgetId !== null}
        onClose={() => setConfirmDeleteWidgetId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить виджет реакций</DialogTitle>
        <DialogContent>
          <Typography>Удалить виджет реакций? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteWidgetId(null)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!confirmDeleteWidgetId) return;
              onDeleteWidget(confirmDeleteWidgetId);
              setConfirmDeleteWidgetId(null);
              setEditOpen(false);
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
