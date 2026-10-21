import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NetworkingGuest } from "../../../features/quizPlay/usePlayerNetworking";
import { resolveClientAssetUrl } from "../../../utils/resolveClientAssetUrl";
import { buildPlayerDialogTextFieldSx } from "../playerDialogStyles";

type GuestsFilter = "all" | "favorites";

function favoritesStorageKey(quizId: string): string {
  return `mq:networking:favorites:${quizId}`;
}

function loadFavoriteGuests(quizId: string): Record<string, NetworkingGuest> {
  try {
    const raw = localStorage.getItem(favoritesStorageKey(quizId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, NetworkingGuest>;
  } catch {
    return {};
  }
}

function saveFavoriteGuests(quizId: string, map: Record<string, NetworkingGuest>): void {
  localStorage.setItem(favoritesStorageKey(quizId), JSON.stringify(map));
}

type Props = {
  quizId: string;
  guests: NetworkingGuest[];
  guestsTotal: number;
  guestsPage: number;
  guestsPageCount: number;
  guestsQuery: string;
  onQueryChange: (value: string) => void;
  onSearch: (query?: string) => void;
  onGuestsPageChange: (page: number) => void;
  selfParticipantId: string | null;
  onOpenProfile: () => void;
  onOpenChat: (peerId: string, peerMeta?: { label?: string; avatarUrl?: string }) => void;
  brandFontFamily: string;
  brandPrimaryColor: string;
  /** Акцентный цвет бренда (низ карточки). */
  brandAccentColor: string;
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
};

function guestIdentityLine(g: NetworkingGuest): string {
  const name = g.fullName.trim() || g.nickname;
  const company = g.company.trim();
  return company ? `${name} · ${company}` : name;
}

function GuestCard(props: {
  guest: NetworkingGuest;
  isSelf: boolean;
  isFavorite: boolean;
  brandPrimaryColor: string;
  brandAccentColor: string;
  accentTextColor: string;
  onOpenChat: (peerId: string, peerMeta?: { label?: string; avatarUrl?: string }) => void;
  onToggleFavorite: (guest: NetworkingGuest) => void;
  onEditProfile?: () => void;
}) {
  const {
    guest: g,
    isSelf,
    isFavorite,
    brandPrimaryColor,
    brandAccentColor,
    accentTextColor,
    onOpenChat,
    onToggleFavorite,
    onEditProfile,
  } = props;
  const title = g.fullName.trim() || g.nickname;
  const avatarSrc = g.avatarUrl ? resolveClientAssetUrl(g.avatarUrl) : undefined;
  const topBandHeight = 56;

  function openChat() {
    onOpenChat(g.participantId, {
      label: g.fullName.trim() || g.nickname,
      avatarUrl: g.avatarUrl,
    });
  }

  return (
    <Box
      onClick={!isSelf ? openChat : undefined}
      role={!isSelf ? "button" : undefined}
      tabIndex={!isSelf ? 0 : undefined}
      onKeyDown={
        !isSelf
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openChat();
              }
            }
          : undefined
      }
      sx={{
        position: "relative",
        borderRadius: 2,
        overflow: "visible",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        cursor: !isSelf ? "pointer" : undefined,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 64px 1fr",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          height: topBandHeight,
          bgcolor: "rgba(0,0,0,0.55)",
          color: "#fff",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Box
          sx={{
            position: "relative",
            minWidth: 0,
            textAlign: "left",
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              left: 0,
              top: -14,
              lineHeight: 1,
              fontSize: "0.65rem",
              opacity: 0.85,
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Чем полезен
          </Typography>
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              fontSize: "0.875rem",
              lineHeight: 1.25,
            }}
          >
            {g.offers.trim() || "ничем не полезен"}
          </Typography>
        </Box>

        <Box aria-hidden sx={{ width: 64 }} />

        <Box
          sx={{
            position: "relative",
            minWidth: 0,
            textAlign: "right",
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              right: 0,
              top: -14,
              lineHeight: 1,
              fontSize: "0.65rem",
              opacity: 0.85,
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Что ищу
          </Typography>
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              fontSize: "0.875rem",
              lineHeight: 1.25,
            }}
          >
            {g.seeking.trim() || "ничего не ищу"}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: topBandHeight,
          transform: "translate(-50%, -70%)",
          zIndex: 2,
        }}
      >
        <Avatar
          src={avatarSrc}
          sx={{
            width: 56,
            height: 56,
            border: "2px solid",
            borderColor: brandAccentColor,
            bgcolor: "grey.200",
            color: "#111",
            fontSize: "1.1rem",
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {title.slice(0, 1).toUpperCase()}
        </Avatar>
        {g.online ? (
          <Box
            sx={{
              position: "absolute",
              right: 2,
              bottom: 2,
              width: 11,
              height: 11,
              borderRadius: "50%",
              bgcolor: "success.main",
              border: "2px solid #fff",
            }}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          position: "relative",
          px: 1.5,
          pt: 2.75,
          pb: 1.1,
          minHeight: 52,
          bgcolor: brandAccentColor,
          color: accentTextColor,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          fontWeight={700}
          textAlign="center"
          sx={{
            wordBreak: "break-word",
            lineHeight: 1.25,
            fontSize: "0.95rem",
            px: isSelf ? 5 : 5.5,
          }}
        >
          {guestIdentityLine(g)}
        </Typography>
        {!isSelf ? (
          <IconButton
            aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(g);
            }}
            sx={{
              position: "absolute",
              left: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              color: "inherit",
              bgcolor: "transparent",
              "&:hover": { bgcolor: "transparent", opacity: 0.8 },
              "& .MuiSvgIcon-root": { color: "inherit" },
            }}
          >
            {isFavorite ? (
              <StarIcon sx={{ fontSize: 22 }} />
            ) : (
              <StarBorderIcon sx={{ fontSize: 22 }} />
            )}
          </IconButton>
        ) : null}
        {isSelf ? (
          <Chip
            size="small"
            label="Мой профиль"
            onClick={onEditProfile}
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(0,0,0,0.12)",
              color: accentTextColor,
              cursor: "pointer",
            }}
          />
        ) : (
          <IconButton
            aria-label="Написать"
            onClick={(e) => {
              e.stopPropagation();
              openChat();
            }}
            sx={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              color: "inherit",
              bgcolor: "transparent",
              "&:hover": { bgcolor: "transparent", opacity: 0.8 },
              "& .MuiSvgIcon-root": { color: "inherit" },
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 22 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

export function PlayerNetworkingGuestsPanel(props: Props) {
  const {
    quizId,
    guests,
    guestsTotal,
    guestsPage,
    guestsPageCount,
    guestsQuery,
    onQueryChange,
    onSearch,
    onGuestsPageChange,
    selfParticipantId,
    onOpenProfile,
    onOpenChat,
    brandFontFamily,
    brandPrimaryColor,
    brandAccentColor,
    formBackgroundColor,
    formTextColor,
    formInputTextColor,
  } = props;
  const [searchOpen, setSearchOpen] = useState(false);
  const [guestsFilter, setGuestsFilter] = useState<GuestsFilter>("all");
  const [favoriteGuests, setFavoriteGuests] = useState<Record<string, NetworkingGuest>>(() =>
    loadFavoriteGuests(quizId),
  );
  const favoritesCount = Object.keys(favoriteGuests).length;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFavoriteGuests(loadFavoriteGuests(quizId));
    setGuestsFilter("all");
  }, [quizId]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const skipScrollOnMountRef = useRef(true);
  useEffect(() => {
    if (skipScrollOnMountRef.current) {
      skipScrollOnMountRef.current = false;
      return;
    }
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [guestsPage]);

  useEffect(() => {
    setFavoriteGuests((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const g of guests) {
        const existing = next[g.participantId];
        if (!existing) continue;
        if (
          existing.fullName !== g.fullName ||
          existing.company !== g.company ||
          existing.avatarUrl !== g.avatarUrl ||
          existing.offers !== g.offers ||
          existing.seeking !== g.seeking ||
          existing.online !== g.online ||
          existing.nickname !== g.nickname
        ) {
          next[g.participantId] = g;
          changed = true;
        }
      }
      if (!changed) return prev;
      saveFavoriteGuests(quizId, next);
      return next;
    });
  }, [guests, quizId]);

  function closeSearch() {
    setSearchOpen(false);
    if (guestsQuery) {
      onQueryChange("");
      onSearch("");
    }
  }

  function toggleFavorite(guest: NetworkingGuest) {
    setFavoriteGuests((prev) => {
      const next = { ...prev };
      if (next[guest.participantId]) delete next[guest.participantId];
      else next[guest.participantId] = guest;
      saveFavoriteGuests(quizId, next);
      return next;
    });
  }

  const displayedGuests = useMemo(() => {
    if (guestsFilter === "favorites") {
      return Object.values(favoriteGuests).sort((a, b) => {
        const an = (a.fullName.trim() || a.nickname).toLowerCase();
        const bn = (b.fullName.trim() || b.nickname).toLowerCase();
        return an.localeCompare(bn, "ru");
      });
    }
    return guests;
  }, [favoriteGuests, guests, guestsFilter]);

  const fieldSx = buildPlayerDialogTextFieldSx(
    formBackgroundColor,
    formInputTextColor,
    brandFontFamily,
  );

  const showPager = guestsFilter === "all" && guestsPageCount > 1;
  const bottomNavHeight = 56;
  const gapAboveNav = 50;
  const pagerHeight = 56;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        mt: 1,
        // 50px над навигацией (+ высота пагинации, если она есть)
        pb: `${bottomNavHeight + gapAboveNav + (showPager ? pagerHeight : 0)}px`,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ flexShrink: 0 }}
      >
        {searchOpen ? (
          <TextField
            size="small"
            fullWidth
            placeholder="Поиск гостей"
            value={guestsQuery}
            inputRef={searchInputRef}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
              if (e.key === "Escape") closeSearch();
            }}
            InputProps={{
              endAdornment: (
                <IconButton
                  edge="end"
                  size="small"
                  aria-label="Закрыть поиск"
                  onClick={closeSearch}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={fieldSx}
          />
        ) : (
          <>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={guestsFilter}
              onChange={(_, value: GuestsFilter | null) => {
                if (value) setGuestsFilter(value);
              }}
              sx={{
                "& .MuiToggleButton-root": {
                  color: formTextColor,
                  borderColor: brandAccentColor,
                  bgcolor: `${brandAccentColor}59`,
                  px: 1.5,
                  gap: 0.5,
                  textTransform: "none",
                  "&:hover": { bgcolor: `${brandAccentColor}80` },
                  "&.Mui-selected": {
                    color: formTextColor,
                    bgcolor: brandAccentColor,
                    borderColor: brandAccentColor,
                    "&:hover": { bgcolor: brandAccentColor, opacity: 0.92 },
                  },
                },
              }}
            >
              <ToggleButton value="all">Все · {guestsTotal}</ToggleButton>
              <ToggleButton value="favorites">Избранные · {favoritesCount}</ToggleButton>
            </ToggleButtonGroup>
            <IconButton
              aria-label="Поиск гостей"
              onClick={() => setSearchOpen(true)}
              sx={{
                color: formTextColor,
                bgcolor: brandAccentColor,
                "&:hover": { bgcolor: brandAccentColor, opacity: 0.92 },
              }}
            >
              <SearchIcon />
            </IconButton>
          </>
        )}
      </Stack>

      <Stack
        ref={listRef}
        spacing={4}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "visible",
          pt: 2.5,
          pb: 1,
          bgcolor: "transparent",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {displayedGuests.length === 0 && guestsFilter === "favorites" ? (
          <Typography
            variant="body2"
            sx={{ color: formTextColor, opacity: 0.8, textAlign: "center", py: 2 }}
          >
            Пока никого нет в избранном — нажмите ★ на карточке гостя
          </Typography>
        ) : null}
        {displayedGuests.map((g, index) => {
          const isSelf = g.participantId === selfParticipantId;
          const items = [
            <GuestCard
              key={g.participantId}
              guest={g}
              isSelf={isSelf}
              isFavorite={Boolean(favoriteGuests[g.participantId])}
              brandPrimaryColor={brandPrimaryColor}
              brandAccentColor={brandAccentColor}
              accentTextColor={formTextColor}
              onOpenChat={onOpenChat}
              onToggleFavorite={toggleFavorite}
              onEditProfile={onOpenProfile}
            />,
          ];
          if (isSelf && index === 0 && displayedGuests.length > 1) {
            items.push(
              <Divider
                key={`${g.participantId}-divider`}
                sx={{ borderColor: brandAccentColor, opacity: 0.85 }}
              />,
            );
          }
          return items;
        })}
      </Stack>

      {showPager ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: bottomNavHeight + gapAboveNav,
            width: "100%",
            maxWidth: 576,
            height: pagerHeight,
            zIndex: 19,
            px: 2,
            boxSizing: "border-box",
          }}
        >
          <IconButton
            aria-label="Предыдущая страница"
            disabled={guestsPage <= 0}
            onClick={() => onGuestsPageChange(guestsPage - 1)}
            sx={{
              color: formTextColor,
              bgcolor: `${brandAccentColor}59`,
              "&:hover": { bgcolor: `${brandAccentColor}80` },
              "&.Mui-disabled": {
                bgcolor: `${brandAccentColor}33`,
                color: formTextColor,
                opacity: 0.45,
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="body2"
            sx={{
              color: formTextColor,
              minWidth: 64,
              textAlign: "center",
              px: 1.25,
              py: 0.75,
              borderRadius: 1,
              bgcolor: `${brandAccentColor}59`,
            }}
          >
            {guestsPage + 1} / {guestsPageCount}
          </Typography>
          <IconButton
            aria-label="Следующая страница"
            disabled={guestsPage >= guestsPageCount - 1}
            onClick={() => onGuestsPageChange(guestsPage + 1)}
            sx={{
              color: formTextColor,
              bgcolor: `${brandAccentColor}59`,
              "&:hover": { bgcolor: `${brandAccentColor}80` },
              "&.Mui-disabled": {
                bgcolor: `${brandAccentColor}33`,
                color: formTextColor,
                opacity: 0.45,
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      ) : null}
    </Box>
  );
}
