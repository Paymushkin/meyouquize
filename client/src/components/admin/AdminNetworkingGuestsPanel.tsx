import { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import type { useAdminNetworkingGuests } from "../../features/admin/useAdminNetworkingGuests";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

type Props = {
  networking: ReturnType<typeof useAdminNetworkingGuests>;
  /** Заголовок блока; пустая строка — без заголовка. */
  title?: string;
};

type SortKey =
  | "nickname"
  | "fullName"
  | "jobTitle"
  | "company"
  | "offers"
  | "seeking"
  | "chatsCount"
  | "messagesCount";

type SortDir = "asc" | "desc";

function compareText(a: string, b: string, dir: SortDir): number {
  const cmp = a.trim().localeCompare(b.trim(), "ru", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

function compareNumber(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

export function AdminNetworkingGuestsPanel({ networking, title = "Гости" }: Props) {
  const {
    guests,
    drafts,
    loading,
    savingId,
    error,
    message,
    load,
    updateDraft,
    saveGuest,
    isDirty,
  } = networking;
  const [sortKey, setSortKey] = useState<SortKey>("nickname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "chatsCount" || key === "messagesCount" ? "desc" : "asc");
  }

  const sortedGuests = useMemo(() => {
    const rows = [...guests];
    rows.sort((a, b) => {
      const da = drafts[a.participantId];
      const db = drafts[b.participantId];
      if (!da || !db) return 0;
      switch (sortKey) {
        case "nickname":
          return compareText(da.nickname, db.nickname, sortDir);
        case "fullName":
          return compareText(da.fullName, db.fullName, sortDir);
        case "jobTitle":
          return compareText(da.jobTitle, db.jobTitle, sortDir);
        case "company":
          return compareText(da.company, db.company, sortDir);
        case "offers":
          return compareText(da.offers, db.offers, sortDir);
        case "seeking":
          return compareText(da.seeking, db.seeking, sortDir);
        case "chatsCount":
          return compareNumber(a.chatsCount, b.chatsCount, sortDir);
        case "messagesCount":
          return compareNumber(a.messagesCount, b.messagesCount, sortDir);
        default:
          return 0;
      }
    });
    return rows;
  }, [guests, drafts, sortKey, sortDir]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        {title ? <Typography variant="h6">{title}</Typography> : <Box />}
        <Button size="small" variant="outlined" onClick={() => void load()} disabled={loading}>
          Обновить
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      {loading && guests.length === 0 ? (
        <Box sx={{ py: 6, display: "grid", placeItems: "center" }}>
          <CircularProgress size={36} />
        </Box>
      ) : guests.length === 0 ? (
        <Typography color="text.secondary">Пока нет участников в этом ивенте.</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell width={72}>Аватар</TableCell>
                <TableCell sortDirection={sortKey === "nickname" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "nickname"}
                    direction={sortKey === "nickname" ? sortDir : "asc"}
                    onClick={() => toggleSort("nickname")}
                  >
                    Ник
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === "fullName" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "fullName"}
                    direction={sortKey === "fullName" ? sortDir : "asc"}
                    onClick={() => toggleSort("fullName")}
                  >
                    ФИО
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === "jobTitle" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "jobTitle"}
                    direction={sortKey === "jobTitle" ? sortDir : "asc"}
                    onClick={() => toggleSort("jobTitle")}
                  >
                    Должность
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === "company" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "company"}
                    direction={sortKey === "company" ? sortDir : "asc"}
                    onClick={() => toggleSort("company")}
                  >
                    Компания / аптека
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === "offers" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "offers"}
                    direction={sortKey === "offers" ? sortDir : "asc"}
                    onClick={() => toggleSort("offers")}
                  >
                    Полезен
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === "seeking" ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === "seeking"}
                    direction={sortKey === "seeking" ? sortDir : "asc"}
                    onClick={() => toggleSort("seeking")}
                  >
                    Ищу
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  width={72}
                  sortDirection={sortKey === "chatsCount" ? sortDir : false}
                >
                  <TableSortLabel
                    active={sortKey === "chatsCount"}
                    direction={sortKey === "chatsCount" ? sortDir : "desc"}
                    onClick={() => toggleSort("chatsCount")}
                    sx={{
                      flexDirection: "row-reverse",
                      justifyContent: "flex-start",
                      width: "100%",
                    }}
                  >
                    Чаты
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  width={96}
                  sortDirection={sortKey === "messagesCount" ? sortDir : false}
                >
                  <TableSortLabel
                    active={sortKey === "messagesCount"}
                    direction={sortKey === "messagesCount" ? sortDir : "desc"}
                    onClick={() => toggleSort("messagesCount")}
                    sx={{
                      flexDirection: "row-reverse",
                      justifyContent: "flex-start",
                      width: "100%",
                    }}
                  >
                    Сообщения
                  </TableSortLabel>
                </TableCell>
                <TableCell width={140}>В каталоге</TableCell>
                <TableCell width={120} />
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedGuests.map((guest) => {
                const draft = drafts[guest.participantId];
                if (!draft) return null;
                const avatarSrc = guest.avatarUrl
                  ? resolveClientAssetUrl(guest.avatarUrl)
                  : undefined;
                const label = draft.fullName.trim() || draft.nickname.trim() || "?";
                const dirty = isDirty(guest.participantId);
                const saving = savingId === guest.participantId;
                return (
                  <TableRow key={guest.participantId} hover>
                    <TableCell>
                      <Avatar src={avatarSrc} sx={{ width: 44, height: 44 }}>
                        {label.slice(0, 1).toUpperCase()}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.nickname}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { nickname: e.target.value })
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.fullName}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { fullName: e.target.value })
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.jobTitle}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { jobTitle: e.target.value })
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.company}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { company: e.target.value })
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.offers}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { offers: e.target.value })
                        }
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.seeking}
                        onChange={(e) =>
                          updateDraft(guest.participantId, { seeking: e.target.value })
                        }
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    </TableCell>
                    <TableCell align="right">{guest.chatsCount}</TableCell>
                    <TableCell align="right">{guest.messagesCount}</TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={draft.visibleInDirectory}
                            onChange={(_, checked) =>
                              updateDraft(guest.participantId, {
                                visibleInDirectory: checked,
                              })
                            }
                          />
                        }
                        label={draft.visibleInDirectory ? "Да" : "Нет"}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!dirty || saving}
                        onClick={() => void saveGuest(guest.participantId)}
                      >
                        {saving ? "…" : "Сохранить"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
