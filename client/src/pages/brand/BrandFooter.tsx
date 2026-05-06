import { Box, Container, Link as MuiLink, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function BrandFooter() {
  const year = new Date().getFullYear();
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              component="img"
              src="/logo.svg"
              alt="Meyouquize"
              sx={{ width: 28, height: 28, display: "block" }}
            />
            <Box component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
              © {year} Meyouquize
            </Box>
          </Stack>
          <Stack direction="row" spacing={3}>
            <MuiLink
              component={RouterLink}
              to="/admin"
              underline="hover"
              sx={{ color: "text.secondary", fontSize: 14 }}
            >
              Админка
            </MuiLink>
            <MuiLink
              component={RouterLink}
              to="/q/demo"
              underline="hover"
              sx={{ color: "text.secondary", fontSize: 14 }}
            >
              Демо
            </MuiLink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
