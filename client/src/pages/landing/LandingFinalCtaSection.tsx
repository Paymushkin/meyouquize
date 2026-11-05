import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { BRAND_BORDER, BRAND_TEXT_MUTED, BRAND_DISPLAY_FONT } from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { useLandingContact } from "./LandingContactDialog";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

export function LandingFinalCtaSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const { openContact } = useLandingContact();

  return (
    <Box
      component="section"
      id="request"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 9, md: 13 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack
          spacing={3}
          alignItems={{ xs: "flex-start", md: "center" }}
          textAlign={{ xs: "left", md: "center" }}
          sx={{ ...landingRevealSx(visible), maxWidth: 720, mx: "auto" }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              fontSize: { xs: "2.25rem", md: "3.5rem" },
              lineHeight: 1.02,
            }}
          >
            {lt("Сделаем ваш следующий ивент живым")}
          </Typography>
          <Typography
            sx={{
              color: BRAND_TEXT_MUTED,
              fontSize: { xs: "1.05rem", md: "1.15rem" },
              lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            {lt(
              "Расскажите о дате и формате - предложим интерактивы и флеш-интервью под задачу и бренд.",
            )}
          </Typography>
          <Button
            type="button"
            onClick={openContact}
            variant="contained"
            color="primary"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{
              width: { xs: "100%", sm: "auto" },
              px: { xs: 2.5, sm: 4 },
              py: 1.5,
              fontSize: { xs: "1rem", sm: "1.05rem" },
              whiteSpace: "nowrap",
              transition: "transform 220ms ease",
              "&:hover": { transform: "translateY(-1px)" },
            }}
          >
            Обсудить мероприятие
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
