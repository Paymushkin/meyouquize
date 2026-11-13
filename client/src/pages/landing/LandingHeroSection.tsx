import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_HEADER_OVER_HERO_HEIGHT_PX,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { useLandingContact } from "./LandingContactDialog";
import { LANDING_CANVAS_MAX_WIDTH, lt } from "./landingConstants";

const heroKenBurns = keyframes`
  0% { transform: scale(1.03) translate3d(0, 0, 0); }
  100% { transform: scale(1.07) translate3d(0.8%, 0.4%, 0); }
`;

const heroFrameIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const heroZhivymAccent = keyframes`
  from { color: #fff; }
  to { color: ${BRAND_ACCENT}; }
`;

const heroStaggerIn = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Пустой зал → заполнение → экран загорается (без UI сервиса) */
const HERO_SEQ = [
  { src: "/hero-seq-01.webp", delayMs: 0 },
  { src: "/hero-seq-02.webp", delayMs: 450 },
  { src: "/hero-seq-03.webp", delayMs: 1000 },
  { src: "/hero-seq-04.webp", delayMs: 1600 },
  { src: "/hero-seq-05.webp", delayMs: 2200 },
] as const;

/** Crossfade укладывается в 3с вместе с последним кадром */
const HERO_FRAME_FADE_MS = 800;
const HERO_FRAME_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";
const HERO_SCREEN_ON_DELAY_MS = HERO_SEQ[HERO_SEQ.length - 1].delayMs;

const heroBgLayerSx = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: { xs: "55% center", md: "50% center" },
} as const;

export function LandingHeroSection() {
  const { openContact } = useLandingContact();

  return (
    <Box
      component="section"
      id="hero"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "#000",
        minHeight: { xs: "100svh", md: "100vh" },
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          transform: "scale(1.03)",
          animation: `${heroKenBurns} 32s ease-in-out infinite alternate`,
          willChange: "transform",
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
        }}
      >
        {HERO_SEQ.map((frame, index) => {
          const isBase = index === 0;
          const isLast = index === HERO_SEQ.length - 1;
          return (
            <Box
              key={frame.src}
              sx={{
                ...heroBgLayerSx,
                backgroundImage: `url('${frame.src}')`,
                opacity: isBase ? 1 : 0,
                "@media (prefers-reduced-motion: no-preference)": {
                  ...(!isBase
                    ? {
                        animation: `${heroFrameIn} ${HERO_FRAME_FADE_MS}ms ${HERO_FRAME_EASE} ${frame.delayMs}ms both`,
                      }
                    : null),
                },
                "@media (prefers-reduced-motion: reduce)": {
                  opacity: isLast ? 1 : 0,
                  animation: "none",
                },
              }}
            />
          );
        })}
      </Box>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background: {
            xs: `
              radial-gradient(ellipse 78% 72% at 55% 48%, transparent 28%, rgba(0,0,0,0.55) 68%, #000 100%),
              linear-gradient(90deg, #000 0%, rgba(0,0,0,0.72) 28%, transparent 52%, rgba(0,0,0,0.35) 88%, #000 100%),
              linear-gradient(180deg, #000 0%, transparent 22%, transparent 58%, #000 100%)
            `,
            md: `
              radial-gradient(ellipse 70% 68% at 52% 46%, transparent 32%, rgba(0,0,0,0.45) 66%, #000 100%),
              linear-gradient(90deg, #000 0%, rgba(0,0,0,0.78) 22%, rgba(0,0,0,0.2) 48%, transparent 62%, rgba(0,0,0,0.4) 90%, #000 100%),
              linear-gradient(180deg, #000 0%, transparent 18%, transparent 55%, rgba(0,0,0,0.75) 88%, #000 100%)
            `,
          },
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: LANDING_CANVAS_MAX_WIDTH,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          minHeight: { xs: "100svh", md: "min(920px, 100vh)" },
          pt: {
            xs: `${BRAND_HEADER_OVER_HERO_HEIGHT_PX + 28}px`,
            md: `${BRAND_HEADER_OVER_HERO_HEIGHT_PX + 40}px`,
          },
          pb: { xs: 5, md: 7 },
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Stack
          spacing={0}
          sx={{
            width: "100%",
            "@media (prefers-reduced-motion: no-preference)": {
              "& > *:nth-of-type(1)": {
                animation: `${heroStaggerIn} 800ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: "80ms",
              },
              "& > *:nth-of-type(2)": {
                animation: `${heroStaggerIn} 800ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: "180ms",
              },
              "& > *:nth-of-type(3)": {
                animation: `${heroStaggerIn} 800ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: "280ms",
              },
              "& > *:nth-of-type(4)": {
                animation: `${heroStaggerIn} 800ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                animationDelay: "380ms",
              },
            },
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: { xs: "0.08em", sm: "0.12em" },
              lineHeight: 0.95,
              fontSize: {
                xs: "clamp(3.2rem, 18vw, 5.5rem)",
                sm: "clamp(5rem, 14vw, 7.5rem)",
                md: "clamp(6.5rem, 12vw, 9rem)",
              },
              textTransform: "uppercase",
              width: "100%",
              mb: { xs: 1, md: 1.25 },
            }}
          >
            МИЮ
          </Typography>
          <Typography
            component="p"
            aria-label="Делаем мероприятие живым"
            sx={{
              fontFamily: BRAND_DISPLAY_FONT,
              fontWeight: 800,
              letterSpacing: { xs: "0.04em", sm: "0.08em" },
              lineHeight: 1.05,
              fontSize: {
                xs: "clamp(1.2rem, 5.5vw, 1.65rem)",
                sm: "clamp(1.6rem, 3.8vw, 2.15rem)",
                md: "clamp(1.85rem, 3.2vw, 2.6rem)",
              },
              textTransform: "uppercase",
              width: "100%",
              m: 0,
            }}
          >
            <Box
              component="span"
              sx={{ display: "block", whiteSpace: { xs: "normal", sm: "nowrap" } }}
            >
              Делаем мероприятие
            </Box>
            <Box
              component="span"
              sx={{
                display: "block",
                color: "#fff",
                textAlign: { xs: "left", sm: "right" },
                whiteSpace: { xs: "normal", sm: "nowrap" },
                "@media (prefers-reduced-motion: no-preference)": {
                  animation: `${heroZhivymAccent} ${HERO_FRAME_FADE_MS}ms ${HERO_FRAME_EASE} ${HERO_SCREEN_ON_DELAY_MS}ms both`,
                },
                "@media (prefers-reduced-motion: reduce)": {
                  color: BRAND_ACCENT,
                },
              }}
            >
              живым
            </Box>
          </Typography>
          <Box
            sx={{
              mt: { xs: 1.5, md: 1.75 },
              mb: { xs: 2.5, md: 3 },
            }}
          >
            <Typography
              sx={{
                color: BRAND_TEXT_MUTED,
                fontSize: { xs: "1.02rem", md: "1.125rem" },
                lineHeight: 1.4,
                maxWidth: { xs: "92vw", sm: "36rem", md: "38rem" },
              }}
            >
              {lt("Интерактивы для всего зала и контент с гостями -")}
              <br />
              {lt("под вашим брендом и с нашей командой на площадке.")}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            useFlexGap
            sx={{
              width: "100%",
              maxWidth: "100%",
              justifyContent: { xs: "stretch", sm: "flex-end" },
              alignItems: { xs: "stretch", sm: "center" },
            }}
          >
            <Button
              type="button"
              onClick={openContact}
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                whiteSpace: "nowrap",
                borderRadius: 0,
                px: { xs: 2.5, md: 3.75 },
                py: { xs: 1.35, md: 1.65 },
                fontSize: { xs: "0.98rem", md: "1.125rem" },
                fontWeight: 700,
                lineHeight: 1.2,
                transition: "transform 220ms ease, box-shadow 220ms ease",
                "&:hover": { transform: "translateY(-1px)" },
              }}
            >
              Обсудить мероприятие
            </Button>
            <Button
              component="a"
              href="#proof"
              variant="outlined"
              color="secondary"
              size="large"
              sx={{
                width: { xs: "100%", sm: "auto" },
                whiteSpace: "nowrap",
                borderRadius: 0,
                px: { xs: 2.5, md: 3.75 },
                py: { xs: 1.35, md: 1.65 },
                fontSize: { xs: "0.98rem", md: "1.125rem" },
                fontWeight: 700,
                lineHeight: 1.2,
                borderColor: "rgba(255,255,255,0.45)",
                color: "#fff",
                "&:hover": {
                  borderColor: "#fff",
                  bgcolor: "rgba(255,255,255,0.06)",
                },
              }}
            >
              Смотреть возможности
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
