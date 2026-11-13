import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Dialog, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_DISPLAY_FONT,
  BRAND_TEXT_MUTED,
} from "../../theme/brandTheme";
import {
  LANDING_CONTACT_EMAIL,
  LANDING_CONTACT_PHONE_DISPLAY,
  LANDING_CONTACT_PHONE_TEL,
  LANDING_REQUEST_MAILTO,
  lt,
} from "./landingConstants";
import { reachYandexMetrikaGoal, YM_GOAL } from "./yandexMetrika";

type LandingContactContextValue = {
  openContact: () => void;
};

const LandingContactContext = createContext<LandingContactContextValue | null>(null);

export function useLandingContact(): LandingContactContextValue {
  const ctx = useContext(LandingContactContext);
  if (!ctx) {
    return {
      openContact: () => {
        reachYandexMetrikaGoal(YM_GOAL.contactOpen);
        window.location.href = LANDING_REQUEST_MAILTO;
      },
    };
  }
  return ctx;
}

export function LandingContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openContact = useCallback(() => {
    reachYandexMetrikaGoal(YM_GOAL.contactOpen);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openContact }), [openContact]);

  return (
    <LandingContactContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: "#0a0a0a",
            color: "#fff",
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 0,
            backgroundImage: "none",
            m: 2,
            width: "100%",
            maxWidth: 420,
          },
        }}
        slotProps={{
          backdrop: {
            sx: { bgcolor: alpha("#000", 0.72) },
          },
        }}
      >
        <Box sx={{ p: { xs: 2.5, sm: 3 }, position: "relative" }}>
          <IconButton
            aria-label={lt("Закрыть")}
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: BRAND_TEXT_MUTED,
              "&:hover": { color: "#fff" },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>

          <Typography
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontSize: { xs: "1.35rem", sm: "1.5rem" },
              lineHeight: 1.15,
              pr: 4,
              mb: 1,
            }}
          >
            {lt("Связаться с нами")}
          </Typography>
          <Typography sx={{ color: BRAND_TEXT_MUTED, mb: 2.5, lineHeight: 1.5 }}>
            {lt("Выберите удобный способ связи")}
          </Typography>

          <Stack spacing={1.25}>
            <ContactOption
              href={LANDING_REQUEST_MAILTO}
              icon={<MailOutlineRoundedIcon />}
              title={lt("Написать на почту")}
              subtitle={LANDING_CONTACT_EMAIL}
              onNavigate={() => setOpen(false)}
            />
            <ContactOption
              href={LANDING_CONTACT_PHONE_TEL}
              icon={<PhoneRoundedIcon />}
              title={lt("Позвонить")}
              subtitle={LANDING_CONTACT_PHONE_DISPLAY}
              accent
              onNavigate={() => setOpen(false)}
            />
          </Stack>
        </Box>
      </Dialog>
    </LandingContactContext.Provider>
  );
}

function ContactOption({
  href,
  icon,
  title,
  subtitle,
  accent = false,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Box
      component="a"
      href={href}
      onClick={onNavigate}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.75,
        py: 1.5,
        textDecoration: "none",
        color: accent ? "#000" : "#fff",
        bgcolor: accent ? BRAND_ACCENT : alpha("#fff", 0.04),
        border: `1px solid ${accent ? BRAND_ACCENT : BRAND_BORDER}`,
        transition: "transform 180ms ease, background-color 180ms ease",
        "&:hover": {
          transform: "translateY(-1px)",
          bgcolor: accent ? BRAND_ACCENT : alpha("#fff", 0.07),
          filter: accent ? "brightness(0.96)" : undefined,
        },
      }}
    >
      <Box sx={{ display: "flex", color: "inherit" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>{title}</Typography>
        <Typography
          sx={{
            mt: 0.35,
            fontSize: 13,
            color: accent ? alpha("#000", 0.7) : BRAND_TEXT_MUTED,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}
