import { useEffect, useState } from "react";
import { Box, Button, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { BRAND_ACCENT, BRAND_BORDER, BRAND_TEXT_MUTED } from "../../theme/brandTheme";
import { LANDING_COOKIE_CONSENT_KEY, LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { startYandexMetrika, startYandexMetrikaIfConsented } from "./yandexMetrika";

export function LandingCookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    startYandexMetrikaIfConsented();
    try {
      if (window.localStorage.getItem(LANDING_COOKIE_CONSENT_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(LANDING_COOKIE_CONSENT_KEY, "1");
    } catch {
      /* ignore */
    }
    startYandexMetrika();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <Box
        aria-hidden
        sx={{
          height: { xs: 168, sm: 120 },
          flexShrink: 0,
        }}
      />
      <Box
        role="dialog"
        aria-live="polite"
        aria-label={lt("Уведомление о cookies")}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1400,
          p: { xs: 1.5, md: 2 },
          pb: {
            xs: "calc(12px + env(safe-area-inset-bottom, 0px))",
            md: "calc(16px + env(safe-area-inset-bottom, 0px))",
          },
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            ...LANDING_CONTAINER_SX,
            mx: "auto",
            pointerEvents: "auto",
            bgcolor: alpha("#0a0a0a", 0.96),
            border: `1px solid ${BRAND_BORDER}`,
            borderLeft: `3px solid ${BRAND_ACCENT}`,
            px: { xs: 2, md: 2.5 },
            py: { xs: 2, md: 2.25 },
            boxShadow: `0 -16px 48px ${alpha("#000", 0.45)}`,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography
              sx={{
                color: BRAND_TEXT_MUTED,
                fontSize: { xs: 13, sm: 14 },
                lineHeight: 1.55,
                maxWidth: 820,
              }}
            >
              {lt(
                "Мы используем необходимые cookies и Яндекс.Метрику (в т.ч. вебвизор и карту кликов) для статистики посещений. Нажимая «Принять», вы соглашаетесь с ",
              )}
              <MuiLink
                component={RouterLink}
                to="/cookies"
                underline="hover"
                sx={{ color: "#fff" }}
              >
                {lt("политикой cookies")}
              </MuiLink>
              {lt(" и ")}
              <MuiLink
                component={RouterLink}
                to="/privacy"
                underline="hover"
                sx={{ color: "#fff" }}
              >
                {lt("политикой конфиденциальности")}
              </MuiLink>
              .
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={accept}
              sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
            >
              {lt("Принять")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  );
}
