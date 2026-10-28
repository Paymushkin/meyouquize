import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
import { formatNetworkingGuestIdentity } from "@meyouquize/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NetworkingGuest } from "../../../features/quizPlay/usePlayerNetworking";
import { resolveClientAssetUrl } from "../../../utils/resolveClientAssetUrl";
import { buildPlayerDialogTextFieldSx } from "../playerDialogStyles";
import { loadFavoriteGuests, saveFavoriteGuests } from "./networkingFavorites";

type GuestsFilter = "all" | "favorites";

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
  /** Фон страницы — под sticky-панелью фильтров. */
  pageBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
  /** Фон тела карточки профиля. */
  profileBackgroundColor: string;
  /** Текст на теле карточки профиля. */
  profileTextColor: string;
  /** Подписи колонок из админки (offers/seeking labels). */
  offersLabel?: string;
  seekingLabel?: string;
  showOffers?: boolean;
  showSeeking?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
};

function GuestCard(props: {
  guest: NetworkingGuest;
  isSelf: boolean;
  isFavorite: boolean;
  profileBackgroundColor: string;
  profileTextColor: string;
  offersLabel: string;
  seekingLabel: string;
  showOffers: boolean;
  showSeeking: boolean;
  showPhone: boolean;
  showEmail: boolean;
  onOpenChat: (peerId: string, peerMeta?: { label?: string; avatarUrl?: string }) => void;
  onToggleFavorite: (guest: NetworkingGuest) => void;
  onEditProfile?: () => void;
}) {
  const {
    guest: g,
    isSelf,
    isFavorite,
    profileBackgroundColor,
    profileTextColor,
    offersLabel,
    seekingLabel,
    showOffers,
    showSeeking,
    showPhone,
    showEmail,
    onOpenChat,
    onToggleFavorite,
    onEditProfile,
  } = props;
  const phone = showPhone ? (g.phone ?? "").trim() : "";
  const email = showEmail ? (g.email ?? "").trim() : "";
  const showRightColumn = showSeeking || Boolean(phone) || Boolean(email);
  const showBodyGrid = showOffers || showRightColumn;
  const title = g.fullName.trim() || g.nickname;
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarSrc = !avatarBroken && g.avatarUrl ? resolveClientAssetUrl(g.avatarUrl) : undefined;
  useEffect(() => {
    setAvatarBroken(false);
  }, [g.avatarUrl]);
  const avatarSize = 56;
  const cardRadius = 1.5;
  // «Фон профиля» / «Шрифт профиля» — полоса с ФИО и иконками избранного/чата.
  const nameBarBg =
    isSelf || !/^#[0-9a-fA-F]{6}$/i.test(profileBackgroundColor)
      ? profileBackgroundColor
      : `${profileBackgroundColor}B8`;
  const nameBarFg = profileTextColor;

  function openChat() {
    onOpenChat(g.participantId, {
      label: g.fullName.trim() || g.nickname,
      avatarUrl: g.avatarUrl,
    });
  }

  function handleCardActivate() {
    if (isSelf) onEditProfile?.();
    else openChat();
  }

  return (
    <Box
      onClick={handleCardActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardActivate();
        }
      }}
      sx={{
        position: "relative",
        pt: `${avatarSize / 2 + 18}px`,
        cursor: "pointer",
      }}
    >
      <Box sx={{ position: "relative" }}>
        {showOffers ? (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              left: 14,
              top: 0,
              transform: "translateY(calc(-100% - 4px))",
              zIndex: 2,
              fontWeight: 700,
              fontSize: "0.7rem",
              color: "#fff",
              opacity: 0.92,
              pointerEvents: "none",
              lineHeight: 1.2,
            }}
          >
            {offersLabel}
          </Typography>
        ) : null}
        {showSeeking || showPhone || showEmail ? (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              right: 14,
              top: 0,
              transform: "translateY(calc(-100% - 4px))",
              zIndex: 2,
              fontWeight: 700,
              fontSize: "0.7rem",
              color: "#fff",
              opacity: 0.92,
              pointerEvents: "none",
              lineHeight: 1.2,
            }}
          >
            {seekingLabel}
          </Typography>
        ) : null}

        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translate(-50%, -50%)",
            zIndex: 2,
          }}
        >
          <Avatar
            src={avatarSrc}
            imgProps={{ onError: () => setAvatarBroken(true) }}
            sx={{
              width: avatarSize,
              height: avatarSize,
              border: "2px solid #111",
              bgcolor: "grey.200",
              color: "#111",
              fontSize: "1.1rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
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
            borderRadius: cardRadius,
            overflow: "hidden",
            bgcolor: "#ffffff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
          }}
        >
          {showBodyGrid ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: showOffers && showRightColumn ? "1fr 1fr" : "1fr",
                alignItems: "start",
                alignContent: "start",
                gap: 2,
                px: 1.75,
                py: 1.25,
                height: "fit-content",
                color: "#111111",
              }}
            >
              {showOffers ? (
                <Box sx={{ minWidth: 0, pr: `${avatarSize / 2 + 8}px` }}>
                  <Typography
                    variant="body2"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                      whiteSpace: "pre-line",
                      fontSize: "0.875rem",
                      lineHeight: 1.3,
                      textAlign: "left",
                    }}
                  >
                    {g.offers.trim() || "ничем не полезен"}
                  </Typography>
                </Box>
              ) : null}
              {showRightColumn ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: showOffers ? "flex-end" : "flex-start",
                    gap: 0.5,
                    minWidth: 0,
                    pl: `${avatarSize / 2 + 8}px`,
                  }}
                  onClick={(e) => {
                    if (phone || email) e.stopPropagation();
                  }}
                >
                  {showSeeking ? (
                    <Typography
                      variant="body2"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                        whiteSpace: "pre-line",
                        fontSize: "0.875rem",
                        lineHeight: 1.3,
                        textAlign: showOffers ? "right" : "left",
                        width: "100%",
                      }}
                    >
                      {g.seeking.trim() || "ничего не ищу"}
                    </Typography>
                  ) : null}
                  {phone ? (
                    <Typography
                      variant="body2"
                      component="a"
                      href={`tel:${phone}`}
                      sx={{
                        fontSize: "0.8rem",
                        lineHeight: 1.3,
                        textAlign: showOffers ? "right" : "left",
                        color: "inherit",
                        textDecoration: "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {phone}
                    </Typography>
                  ) : null}
                  {email ? (
                    <Typography
                      variant="body2"
                      component="a"
                      href={`mailto:${email}`}
                      sx={{
                        fontSize: "0.8rem",
                        lineHeight: 1.3,
                        textAlign: showOffers ? "right" : "left",
                        color: "inherit",
                        textDecoration: "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {email}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          ) : null}

          <Box
            sx={{
              position: "relative",
              px: 1.5,
              py: 1,
              minHeight: 48,
              bgcolor: nameBarBg,
              color: nameBarFg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&::before": {
                content: '""',
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translate(-50%, -100%)",
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderBottom: `8px solid ${nameBarBg}`,
              },
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
                color: "inherit",
              }}
            >
              {formatNetworkingGuestIdentity(g)}
            </Typography>
            {isSelf ? (
              <Chip
                size="small"
                icon={<EditOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                label="Это вы"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProfile?.();
                }}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(0,0,0,0.12)",
                  color: "inherit",
                  cursor: "pointer",
                  "& .MuiChip-icon": { color: "inherit" },
                }}
              />
            ) : (
              <>
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
              </>
            )}
          </Box>
        </Box>
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
    pageBackgroundColor,
    formTextColor,
    formInputTextColor,
    profileBackgroundColor,
    profileTextColor,
    offersLabel = "Полезен",
    seekingLabel = "Ищу",
    showOffers = true,
    showSeeking = true,
    showPhone = false,
    showEmail = false,
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
    const scroller = listRef.current?.closest(".MuiContainer-root");
    if (scroller instanceof HTMLElement) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
          existing.jobTitle !== g.jobTitle ||
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

  return (
    <Box ref={listRef} sx={{ mt: -2 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 576,
          minHeight: 56,
          py: 1,
          px: 2,
          zIndex: 10,
          boxSizing: "border-box",
          bgcolor: pageBackgroundColor,
          backgroundImage: "none",
        }}
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
                  bgcolor: `${brandAccentColor}B8`,
                  px: 1.5,
                  gap: 0.5,
                  textTransform: "none",
                  "&:hover": { bgcolor: `${brandAccentColor}D0` },
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

      <Box aria-hidden sx={{ height: 56, mb: 2.5 }} />

      <Stack spacing={4} sx={{ pt: 1, pb: 1 }}>
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
              profileBackgroundColor={profileBackgroundColor}
              profileTextColor={profileTextColor}
              offersLabel={offersLabel}
              seekingLabel={seekingLabel}
              showOffers={showOffers}
              showSeeking={showSeeking}
              showPhone={showPhone}
              showEmail={showEmail}
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
          sx={{ py: 1.5 }}
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
