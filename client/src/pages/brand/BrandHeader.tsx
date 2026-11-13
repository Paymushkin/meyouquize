import { useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Box, Button, Container, Drawer, IconButton, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { BRAND_ACCENT, BRAND_BORDER } from "../../theme/brandTheme";
import { useLandingContact } from "../landing/LandingContactDialog";
import { LANDING_CONTAINER_SX, lt } from "../landing/landingConstants";

interface BrandHeaderProps {
  showDemoButton?: boolean;
  showAdminButton?: boolean;
  /** Прозрачная шапка поверх hero без нижней границы */
  overHero?: boolean;
}

const LANDING_NAV = [
  { label: lt("Возможности"), href: "/#proof" },
  { label: lt("Интерактивы"), href: "/interactives" },
  { label: lt("Интервью"), href: "/flash-interview" },
  { label: lt("Конференция"), href: "/conference" },
  { label: lt("Корпоратив"), href: "/corporate" },
  { label: lt("Для кого"), href: "/#scenarios" },
  { label: "FAQ", href: "/#faq" },
] as const;

const BRAND_LOGO_SIZE_PX = 52;

function BrandWordmark() {
  return (
    <Box
      component="img"
      src="/logo.svg"
      alt="МИЮ"
      sx={{
        width: BRAND_LOGO_SIZE_PX,
        height: BRAND_LOGO_SIZE_PX,
        display: "block",
      }}
    />
  );
}

export function BrandHeader({
  showDemoButton = true,
  showAdminButton = true,
  overHero = false,
}: BrandHeaderProps) {
  const { openContact } = useLandingContact();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <Box
      component="header"
      sx={{
        position: overHero ? "absolute" : "sticky",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 10,
        ...(overHero
          ? {
              background: "transparent",
              backdropFilter: "none",
              borderBottom: "none",
            }
          : {
              backdropFilter: "blur(8px)",
              background: "rgba(0,0,0,0.72)",
              borderBottom: `1px solid ${BRAND_BORDER}`,
            }),
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{
            width: "100%",
            py: 1.5,
            pt: { xs: "calc(12px + env(safe-area-inset-top, 0px))", sm: 1.5 },
            minWidth: 0,
          }}
        >
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            alignItems="center"
            sx={{
              textDecoration: "none",
              color: "text.primary",
              flexShrink: 0,
              "&:hover": { opacity: 0.85 },
            }}
          >
            <BrandWordmark />
          </Stack>

          <Stack
            direction="row"
            spacing={{ xs: 0.75, md: 1.5, xl: 2.5 }}
            alignItems="center"
            sx={{ minWidth: 0, flexShrink: 1 }}
          >
            <Stack
              direction="row"
              spacing={{ lg: 1.75, xl: 2.5 }}
              alignItems="center"
              sx={{
                display: { xs: "none", lg: "flex" },
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {LANDING_NAV.map((item) => (
                <Typography
                  key={item.label}
                  component={RouterLink}
                  to={item.href}
                  sx={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: { lg: 13, xl: 14 },
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Stack>

            {showDemoButton ? (
              <Button
                component={RouterLink}
                to="/q/demo"
                variant="outlined"
                color="inherit"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  flexShrink: 0,
                  borderRadius: 0,
                  borderColor: BRAND_ACCENT,
                  color: "#fff",
                  "&:hover": {
                    borderColor: BRAND_ACCENT,
                    bgcolor: alpha(BRAND_ACCENT, 0.08),
                  },
                }}
              >
                {lt("Демо")}
              </Button>
            ) : null}
            {showAdminButton ? (
              <Button
                type="button"
                onClick={openContact}
                variant="contained"
                color="primary"
                size="medium"
                sx={{
                  display: { xs: "none", lg: "inline-flex" },
                  borderRadius: 0,
                  flexShrink: 0,
                  px: 2,
                  minWidth: 0,
                  fontSize: 14,
                }}
              >
                {lt("Обсудить")}
              </Button>
            ) : null}

            <IconButton
              aria-label={lt("Открыть меню")}
              onClick={() => setMenuOpen(true)}
              sx={{
                display: { xs: "inline-flex", lg: "none" },
                color: "#fff",
                border: `1px solid ${BRAND_BORDER}`,
                borderRadius: 1.5,
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Container>

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={closeMenu}
        PaperProps={{
          sx: {
            width: "min(100%, 320px)",
            bgcolor: "#0a0a0a",
            color: "#fff",
            borderLeft: `1px solid ${BRAND_BORDER}`,
            backgroundImage: "none",
          },
        }}
      >
        <Stack spacing={1} sx={{ p: 2, height: "100%" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{lt("Меню")}</Typography>
            <IconButton aria-label={lt("Закрыть меню")} onClick={closeMenu} sx={{ color: "#fff" }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {LANDING_NAV.map((item) => (
            <Box
              key={item.label}
              component={RouterLink}
              to={item.href}
              onClick={closeMenu}
              sx={{
                px: 1.5,
                py: 1.25,
                textDecoration: "none",
                color: alpha("#fff", 0.9),
                fontWeight: 600,
                borderBottom: `1px solid ${BRAND_BORDER}`,
                "&:hover": { color: BRAND_ACCENT },
              }}
            >
              {item.label}
            </Box>
          ))}

          <Stack spacing={1.25} sx={{ mt: "auto", pt: 2 }}>
            {showDemoButton ? (
              <Button
                component={RouterLink}
                to="/q/demo"
                variant="outlined"
                color="inherit"
                onClick={closeMenu}
                sx={{
                  borderRadius: 0,
                  borderColor: BRAND_ACCENT,
                  color: "#fff",
                  "&:hover": {
                    borderColor: BRAND_ACCENT,
                    bgcolor: alpha(BRAND_ACCENT, 0.08),
                  },
                }}
              >
                {lt("Демо")}
              </Button>
            ) : null}
            {showAdminButton ? (
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={() => {
                  closeMenu();
                  openContact();
                }}
              >
                {lt("Обсудить")}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}
