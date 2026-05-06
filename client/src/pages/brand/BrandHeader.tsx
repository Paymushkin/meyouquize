import { Box, Button, Container, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface BrandHeaderProps {
  showDemoButton?: boolean;
  showAdminButton?: boolean;
}

export function BrandHeader({ showDemoButton = true, showAdminButton = true }: BrandHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,0,0.72)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{
              textDecoration: "none",
              color: "text.primary",
              "&:hover": { opacity: 0.85 },
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt="Meyouquize"
              sx={{ width: 40, height: 40, display: "block" }}
            />
            <Box
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1rem", sm: "1.15rem" },
                letterSpacing: "-0.01em",
              }}
            >
              Meyouquize
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {showDemoButton ? (
              <Button
                component={RouterLink}
                to="/q/demo"
                variant="text"
                color="inherit"
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Демо
              </Button>
            ) : null}
            {showAdminButton ? (
              <Button component={RouterLink} to="/admin" variant="contained" color="primary">
                Войти в админку
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
