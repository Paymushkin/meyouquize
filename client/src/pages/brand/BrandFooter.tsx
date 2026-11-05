import { Box, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  LANDING_CONTACT_EMAIL,
  LANDING_CONTACT_PHONE_DISPLAY,
  LANDING_CONTAINER_SX,
  LANDING_OPERATOR_ADDRESS,
  LANDING_OPERATOR_INN,
  LANDING_OPERATOR_NAME,
  LANDING_OPERATOR_OGRNIP,
  lt,
} from "../landing/landingConstants";

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
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "flex-start" }}
            justifyContent="space-between"
            spacing={2.5}
          >
            <Stack spacing={1.25} sx={{ maxWidth: 720, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box
                  component="img"
                  src="/logo.svg"
                  alt="МИЮ"
                  sx={{ width: 28, height: 28, display: "block" }}
                />
                <Box component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
                  © {year} МИЮ
                </Box>
              </Stack>
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 13,
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                }}
              >
                {lt(LANDING_OPERATOR_NAME)}
              </Typography>
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 13,
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                }}
              >
                {lt(`ИНН ${LANDING_OPERATOR_INN}`)}
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  {" "}
                  ·{" "}
                </Box>
                <Box component="span" sx={{ display: { xs: "block", sm: "inline" } }}>
                  {lt(`ОГРНИП ${LANDING_OPERATOR_OGRNIP}`)}
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 13,
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                }}
              >
                {lt(LANDING_OPERATOR_ADDRESS)}
              </Typography>
              <Stack spacing={0.35}>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 13,
                    lineHeight: 1.55,
                    wordBreak: "break-word",
                  }}
                >
                  {LANDING_CONTACT_EMAIL}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.55 }}>
                  {LANDING_CONTACT_PHONE_DISPLAY}
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
              <MuiLink
                component={RouterLink}
                to="/privacy"
                underline="hover"
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                {lt("Политика конфиденциальности")}
              </MuiLink>
              <MuiLink
                component={RouterLink}
                to="/cookies"
                underline="hover"
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                {lt("Политика cookies")}
              </MuiLink>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
