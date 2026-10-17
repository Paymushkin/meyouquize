import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_BUTTON_BORDER_RADIUS,
  BRAND_TEXT_MUTED,
} from "../../theme/brandTheme";
import {
  InteractiveBarChartIcon,
  InteractiveChatIcon,
  InteractiveGroupsIcon,
  InteractivePieChartIcon,
} from "./LandingInteractiveIcons";

const INTERACTIVE_CANVAS_MAX_WIDTH = 1440;

const INTERACTIVE_DETAILS_MAILTO =
  "mailto:hello@meyouquize.ru?subject=" + encodeURIComponent("Узнать подробнее об интерактивах");

const INTERACTIVE_FEATURES = [
  {
    title: "Мгновенные результаты",
    description: "Показывайте итоги сразу на экране",
    icon: <InteractiveBarChartIcon />,
  },
  {
    title: "Выше вовлечённость",
    description: "Участие с любого устройства без приложений",
    icon: <InteractiveGroupsIcon />,
  },
  {
    title: "Живой диалог",
    description: "Задавайте вопросы и получайте обратную связь",
    icon: <InteractiveChatIcon />,
  },
  {
    title: "Полезная аналитика",
    description: "Понимайте свою аудиторию лучше",
    icon: <InteractivePieChartIcon />,
  },
] as const;

type InteractiveFeatureProps = {
  title: string;
  description: string;
  icon: ReactNode;
};

function InteractiveFeature({ title, description, icon }: InteractiveFeatureProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        sx={{
          flexShrink: 0,
          width: 52,
          height: 52,
          borderRadius: `${BRAND_BUTTON_BORDER_RADIUS}px`,
          border: `1px solid ${BRAND_BORDER}`,
          bgcolor: alpha("#0a0a0a", 0.72),
          display: "grid",
          placeItems: "center",
          color: BRAND_ACCENT,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, pt: 0.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: "1rem", md: "1.05rem" }, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.55 }}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

export function LandingInteractiveSection() {
  return (
    <Box
      component="section"
      id="demo"
      sx={{
        display: "flex",
        justifyContent: "center",
        bgcolor: "#000",
      }}
    >
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          maxWidth: INTERACTIVE_CANVAS_MAX_WIDTH,
          py: { xs: 7, md: 10 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/interactive-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 42%, rgba(0,0,0,0.28) 100%),
              linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.72) 100%)
            `,
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
              gap: { xs: 5, md: 6 },
              alignItems: "center",
            }}
          >
            <Stack spacing={{ xs: 2.5, md: 3 }}>
              <Typography
                sx={{
                  color: BRAND_TEXT_MUTED,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Интерактив
              </Typography>
              <Typography
                component="h2"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  fontSize: { xs: "2.2rem", sm: "2.75rem", md: "3.25rem" },
                }}
              >
                Вовлекайте аудиторию{" "}
                <Box component="span" sx={{ color: BRAND_ACCENT }}>
                  в реальном времени
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: BRAND_TEXT_MUTED,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                  lineHeight: 1.6,
                  maxWidth: 520,
                }}
              >
                Опросы, голосования и Q&A прямо на экране. Больше вовлечения, живой диалог и ценная
                аналитика — без лишних сложностей.
              </Typography>
              <Box sx={{ pt: 0.5 }}>
                <Button
                  component="a"
                  href={INTERACTIVE_DETAILS_MAILTO}
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 3.5,
                    py: 1.35,
                    fontSize: { xs: "0.95rem", md: "1rem" },
                  }}
                >
                  Узнать подробнее
                </Button>
              </Box>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: { xs: 3, md: 3.5 },
              }}
            >
              {INTERACTIVE_FEATURES.map((feature) => (
                <InteractiveFeature
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                />
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
