import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_ACCENT, BRAND_BORDER } from "../../theme/brandTheme";

export interface ErrorMessageAction {
  label: string;
  to: string;
  variant: "contained" | "outlined";
}

interface ErrorMessageProps {
  code: string;
  title: string;
  description: string;
  actions: ErrorMessageAction[];
}

export function ErrorMessage({ code, title, description, actions }: ErrorMessageProps) {
  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 8, md: 12 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: "120vw", md: "70vw" },
          height: { xs: "120vw", md: "70vw" },
          background: `radial-gradient(closest-side, rgba(243,247,34,0.12), rgba(243,247,34,0) 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Stack alignItems="center" textAlign="center" spacing={3}>
          <Typography
            sx={{
              color: BRAND_ACCENT,
              fontFamily: "Roboto, sans-serif",
              fontWeight: 800,
              fontSize: { xs: "5rem", sm: "7rem", md: "9rem" },
              lineHeight: 1,
              letterSpacing: "-0.04em",
              textShadow: "0 0 60px rgba(243,247,34,0.35)",
            }}
          >
            {code}
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 700 }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "text.secondary", maxWidth: 480, lineHeight: 1.6 }}
          >
            {description}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
          >
            {actions.map((action) => (
              <Button
                key={action.label}
                component={RouterLink}
                to={action.to}
                variant={action.variant}
                color="primary"
                size="large"
              >
                {action.label}
              </Button>
            ))}
          </Stack>
          <Box
            sx={{
              mt: 4,
              px: 2,
              py: 0.5,
              borderRadius: 999,
              border: `1px solid ${BRAND_BORDER}`,
              color: "text.secondary",
              fontSize: 12,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Meyouquize
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
