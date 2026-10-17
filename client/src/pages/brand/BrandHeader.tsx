import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_ACCENT, BRAND_BORDER } from "../../theme/brandTheme";

interface BrandHeaderProps {
  showDemoButton?: boolean;
  showAdminButton?: boolean;
  /** Прозрачная шапка поверх hero без нижней границы */
  overHero?: boolean;
}

const LANDING_NAV = [
  { label: "Решения", href: "#demo" },
  { label: "Кейсы", href: "#request" },
  { label: "Как это работает", href: "#demo" },
  { label: "FAQ", href: "#request" },
] as const;

const BRAND_WORDMARK_LOGO_SIZE_PX = 36;

function BrandWordmark() {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box
        component="img"
        src="/logo.svg"
        alt=""
        sx={{
          width: BRAND_WORDMARK_LOGO_SIZE_PX,
          height: BRAND_WORDMARK_LOGO_SIZE_PX,
          display: "block",
        }}
      />
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: BRAND_WORDMARK_LOGO_SIZE_PX,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <Box component="span" sx={{ color: "text.primary" }}>
          МИ
        </Box>
        <Box component="span" sx={{ color: BRAND_ACCENT }}>
          Ю
        </Box>
      </Typography>
    </Stack>
  );
}

export function BrandHeader({
  showDemoButton = true,
  showAdminButton = true,
  overHero = false,
}: BrandHeaderProps) {
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
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ py: 1.5 }}
        >
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            alignItems="center"
            sx={{
              textDecoration: "none",
              color: "text.primary",
              "&:hover": { opacity: 0.85 },
            }}
          >
            <BrandWordmark />
          </Stack>

          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2.5 }}
            alignItems="center"
            sx={{ flexShrink: 0 }}
          >
            <Stack
              direction="row"
              spacing={{ md: 2.5 }}
              alignItems="center"
              sx={{ display: { xs: "none", lg: "flex" } }}
            >
              {LANDING_NAV.map((item) => (
                <Typography
                  key={item.label}
                  component="a"
                  href={item.href}
                  sx={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 14,
                    fontWeight: 500,
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
                component="a"
                href="#demo"
                variant="text"
                color="inherit"
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Демо
              </Button>
            ) : null}
            {showAdminButton ? (
              <Button
                component="a"
                href="#request"
                variant="contained"
                color="primary"
                size="medium"
              >
                Оставить заявку
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
