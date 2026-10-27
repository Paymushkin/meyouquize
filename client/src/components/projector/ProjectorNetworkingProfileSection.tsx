import { Avatar, Box, Stack, Typography } from "@mui/material";
import {
  formatNetworkingGuestIdentity,
  PROJECTOR_NETWORKING_PROFILE_SLOT_SEC,
  type ProjectorNetworkingSpotlightGuest,
  type PublicViewState,
} from "@meyouquize/shared";
import { useEffect, useRef, useState } from "react";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

type SpotlightGuest = ProjectorNetworkingSpotlightGuest;

type Props = {
  view: PublicViewState;
};

const SWAP_MS = 520;

function ProfileMolecule(props: {
  guest: SpotlightGuest;
  labelColor: string;
  profileBackgroundColor: string;
  profileTextColor: string;
  avatarSize: number;
  cardRadius: number;
}) {
  const { guest, labelColor, profileBackgroundColor, profileTextColor, avatarSize, cardRadius } =
    props;
  const title = guest.fullName.trim() || guest.nickname;
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarSrc =
    !avatarBroken && guest.avatarUrl ? resolveClientAssetUrl(guest.avatarUrl) : undefined;
  useEffect(() => {
    setAvatarBroken(false);
  }, [guest.avatarUrl]);

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Avatar
        src={avatarSrc}
        imgProps={{ onError: () => setAvatarBroken(true) }}
        sx={{
          position: "absolute",
          left: "50%",
          top: 0,
          transform: "translate(-50%, -50%)",
          zIndex: 2,
          width: avatarSize,
          height: avatarSize,
          border: "4px solid #111",
          bgcolor: "grey.200",
          color: "#111",
          fontSize: "3.6rem",
          fontWeight: 700,
          boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
        }}
      >
        {title.slice(0, 1).toUpperCase() || "?"}
      </Avatar>

      <Typography
        sx={{
          position: "absolute",
          left: { xs: 12, md: 16 },
          top: 0,
          transform: "translateY(calc(-100% - 10px))",
          zIndex: 2,
          fontWeight: 700,
          fontSize: { xs: "1.05rem", md: "1.25rem" },
          color: labelColor,
          opacity: 0.95,
          lineHeight: 1.2,
          pointerEvents: "none",
        }}
      >
        Полезен
      </Typography>
      <Typography
        sx={{
          position: "absolute",
          right: { xs: 12, md: 16 },
          top: 0,
          transform: "translateY(calc(-100% - 10px))",
          zIndex: 2,
          fontWeight: 700,
          fontSize: { xs: "1.05rem", md: "1.25rem" },
          color: labelColor,
          opacity: 0.95,
          lineHeight: 1.2,
          pointerEvents: "none",
        }}
      >
        Ищу
      </Typography>

      <Box
        sx={{
          borderRadius: cardRadius,
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.28)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
            alignContent: "start",
            gap: { xs: 2, md: 3 },
            px: { xs: 1.5, md: 2 },
            py: { xs: 1.5, md: 2 },
            height: "fit-content",
            color: "#111111",
            bgcolor: "#ffffff",
          }}
        >
          <Typography
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              whiteSpace: "pre-line",
              fontSize: { xs: "1.6rem", md: "2.1rem" },
              lineHeight: 1.3,
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            {guest.offers.trim() || "ничем не полезен"}
          </Typography>
          <Typography
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              whiteSpace: "pre-line",
              fontSize: { xs: "1.6rem", md: "2.1rem" },
              lineHeight: 1.3,
              fontWeight: 500,
              textAlign: "right",
            }}
          >
            {guest.seeking.trim() || "ничего не ищу"}
          </Typography>
        </Box>

        <Box
          sx={{
            position: "relative",
            px: 1.5,
            py: { xs: 2.5, md: 3 },
            minHeight: 88,
            bgcolor: profileBackgroundColor,
            color: profileTextColor,
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
              borderLeft: "12px solid transparent",
              borderRight: "12px solid transparent",
              borderBottom: `14px solid ${profileBackgroundColor}`,
            },
          }}
        >
          <Typography
            fontWeight={700}
            textAlign="center"
            sx={{
              wordBreak: "break-word",
              lineHeight: 1.2,
              fontSize: { xs: "1.9rem", md: "2.6rem" },
              px: 2,
            }}
          >
            {formatNetworkingGuestIdentity(guest)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function ProjectorNetworkingProfileSection({ view }: Props) {
  const guests = view.networkingSpotlightGuests ?? [];
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [fallbackStartedAt] = useState(() => Date.now());
  const startedAt = view.projectorTimeline?.stepStartedAt ?? fallbackStartedAt;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [startedAt, guests.length]);

  const index =
    guests.length === 0
      ? 0
      : Math.floor((nowMs - startedAt) / (PROJECTOR_NETWORKING_PROFILE_SLOT_SEC * 1000)) %
        guests.length;
  const targetGuest = guests[index];

  const [activeGuest, setActiveGuest] = useState<SpotlightGuest | undefined>(targetGuest);
  const [exitingGuest, setExitingGuest] = useState<SpotlightGuest | null>(null);
  const activeGuestRef = useRef(activeGuest);
  activeGuestRef.current = activeGuest;

  useEffect(() => {
    if (!targetGuest) {
      setActiveGuest(undefined);
      setExitingGuest(null);
      return;
    }
    const prev = activeGuestRef.current;
    if (!prev) {
      setActiveGuest(targetGuest);
      return;
    }
    if (prev.participantId === targetGuest.participantId) {
      // Тот же гость — обновить поля/фото без анимации смены.
      if (
        prev.offers !== targetGuest.offers ||
        prev.seeking !== targetGuest.seeking ||
        prev.fullName !== targetGuest.fullName ||
        prev.jobTitle !== targetGuest.jobTitle ||
        prev.avatarUrl !== targetGuest.avatarUrl ||
        prev.company !== targetGuest.company ||
        prev.nickname !== targetGuest.nickname
      ) {
        setActiveGuest(targetGuest);
      }
      return;
    }

    setExitingGuest(prev);
    setActiveGuest(targetGuest);
    const id = window.setTimeout(() => setExitingGuest(null), SWAP_MS);
    return () => window.clearTimeout(id);
  }, [targetGuest]);

  const labelColor = view.voteOptionTextColor || "#fff";
  const profileBackgroundColor =
    view.networkingProfileBackgroundColor || view.brandPrimaryColor || "#7c5acb";
  const profileTextColor = view.networkingProfileTextColor || view.brandTextColor || "#ffffff";
  const avatarSize = 160;
  const cardRadius = 1.5;
  const guest = activeGuest;

  if (!guest) {
    return (
      <Stack
        sx={{
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          px: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: labelColor,
            opacity: 0.75,
            fontFamily: view.brandFontFamily,
            textAlign: "center",
          }}
        >
          Пока нет профилей
        </Typography>
      </Stack>
    );
  }

  const moleculeProps = {
    labelColor,
    profileBackgroundColor,
    profileTextColor,
    avatarSize,
    cardRadius,
  };

  return (
    <Stack
      sx={{
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, md: 2 },
        boxSizing: "border-box",
        fontFamily: view.brandFontFamily,
        bgcolor: "transparent",
        backgroundImage: "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: Math.max(view.projectorContentMaxWidthPx || 0, 1400),
          pt: `${avatarSize / 2}px`,
          bgcolor: "transparent",
          overflow: "visible",
        }}
      >
        {exitingGuest ? (
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${avatarSize / 2}px`,
              zIndex: 1,
              pointerEvents: "none",
              animation: `networkingProfileOut ${SWAP_MS}ms ease forwards`,
              "@keyframes networkingProfileOut": {
                "0%": { opacity: 1, transform: "translateY(0)" },
                "100%": { opacity: 0, transform: "translateY(-36px)" },
              },
            }}
          >
            <ProfileMolecule guest={exitingGuest} {...moleculeProps} />
          </Box>
        ) : null}

        <Box
          key={guest.participantId}
          sx={{
            position: "relative",
            zIndex: 2,
            animation: exitingGuest ? `networkingProfileIn ${SWAP_MS}ms ease both` : undefined,
            "@keyframes networkingProfileIn": {
              "0%": { opacity: 0, transform: "translateY(36px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <ProfileMolecule guest={guest} {...moleculeProps} />
        </Box>
      </Box>
    </Stack>
  );
}
