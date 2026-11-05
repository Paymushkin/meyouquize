import { Box, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_DISPLAY_FONT,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { LandingStatCounter } from "./LandingStatCounter";
import { landingRevealSx, useLandingReveal } from "./useLandingReveal";

const STEPS = [
  {
    when: lt("До ивента"),
    title: lt("Готовим бренд"),
    body: lt("Экран, телефон гостя и ролики в ваших цветах, шрифтах и визуале."),
  },
  {
    when: lt("Старт"),
    title: lt("QR в зале"),
    body: lt("Участники заходят с телефона без приложений - за секунды весь зал онлайн."),
  },
  {
    when: lt("В эфире"),
    title: lt("Живой экран и контент"),
    body: lt("Интерактивы на проекторе и флеш-интервью с гостями - команда МИЮ на площадке."),
  },
] as const;

function StepWhen({ index, when }: { index: number; when: string }) {
  return (
    <Typography
      sx={{
        color: BRAND_ACCENT,
        fontFamily: BRAND_DISPLAY_FONT,
        fontWeight: 700,
        fontSize: { xs: "0.8rem", md: "0.85rem" },
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {String(index + 1).padStart(2, "0")} · {when}
    </Typography>
  );
}

function StepBody({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Typography
        sx={{
          fontFamily: BRAND_DISPLAY_FONT,
          fontWeight: 700,
          fontSize: { xs: "1.3rem", md: "1.45rem" },
          letterSpacing: "-0.02em",
          mb: 1.25,
          maxWidth: 300,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          color: BRAND_TEXT_MUTED,
          lineHeight: 1.65,
          maxWidth: 320,
          fontSize: { md: "1.05rem" },
        }}
      >
        {body}
      </Typography>
    </>
  );
}

export function LandingHowItWorksSection() {
  const { ref, visible } = useLandingReveal<HTMLElement>();

  return (
    <Box
      component="section"
      id="how"
      ref={ref}
      sx={{
        bgcolor: "#000",
        py: { xs: 8, md: 11 },
        borderTop: `1px solid ${BRAND_BORDER}`,
      }}
    >
      <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
        <Stack spacing={{ xs: 5, md: 7 }} sx={landingRevealSx(visible)}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-end" }}
            spacing={2.5}
          >
            <Typography
              component="h2"
              sx={{
                fontFamily: BRAND_DISPLAY_FONT,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: { xs: "2rem", md: "2.75rem" },
                lineHeight: 1.05,
                maxWidth: 520,
              }}
            >
              {lt("Как это работает")}
            </Typography>

            <LandingStatCounter
              value={1500}
              prefix={lt("до ")}
              label={lt("участников онлайн на ивенте")}
            />
          </Stack>

          {/* Mobile: вертикальный таймлайн */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            {STEPS.map((step, index) => {
              const isLast = index === STEPS.length - 1;
              return (
                <Box
                  key={step.title}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "16px 1fr",
                    columnGap: 2,
                    ...landingRevealSx(visible, 100 + index * 100),
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 14,
                        height: 14,
                        flexShrink: 0,
                        borderRadius: "50%",
                        bgcolor: "#000",
                        border: `2px solid ${BRAND_ACCENT}`,
                        boxShadow: `0 0 0 4px ${alpha(BRAND_ACCENT, 0.18)}`,
                        zIndex: 1,
                      }}
                    />
                    {!isLast ? (
                      <Box
                        aria-hidden
                        sx={{
                          width: 2,
                          flex: 1,
                          minHeight: 28,
                          my: 0.75,
                          bgcolor: alpha(BRAND_ACCENT, visible ? 0.55 : 0.2),
                          transition: "background-color 600ms ease",
                        }}
                      />
                    ) : null}
                  </Box>
                  <Box sx={{ pb: isLast ? 0 : 4, pt: 0.15 }}>
                    <Box sx={{ mb: 1.25 }}>
                      <StepWhen index={index} when={step.when} />
                    </Box>
                    <StepBody title={step.title} body={step.body} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Desktop: подпись над линией; точки по центру линии; заголовок/текст слева под линией */}
          <Box sx={{ display: { xs: "none", md: "block" }, position: "relative" }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                columnGap: 4,
                mb: 2,
              }}
            >
              {STEPS.map((step, index) => (
                <Box
                  key={`when-${step.title}`}
                  sx={{
                    ...landingRevealSx(visible, 120 + index * 110),
                    textAlign: "left",
                  }}
                >
                  <StepWhen index={index} when={step.when} />
                </Box>
              ))}
            </Box>

            <Box sx={{ position: "relative" }}>
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 15,
                  height: 2,
                  bgcolor: alpha("#fff", 0.14),
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: visible ? "100%" : "0%",
                    bgcolor: BRAND_ACCENT,
                    transition: "width 1100ms cubic-bezier(0.22, 1, 0.36, 1) 80ms",
                    "@media (prefers-reduced-motion: reduce)": {
                      width: "100%",
                      transition: "none",
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  columnGap: 4,
                }}
              >
                {STEPS.map((step, index) => (
                  <Box
                    key={step.title}
                    sx={{
                      ...landingRevealSx(visible, 120 + index * 110),
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: "100%",
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        mb: 2.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          bgcolor: "#000",
                          border: `2px solid ${BRAND_ACCENT}`,
                          boxShadow: visible
                            ? `0 0 0 6px ${alpha(BRAND_ACCENT, 0.16)}`
                            : `0 0 0 0 ${alpha(BRAND_ACCENT, 0)}`,
                          transition: `box-shadow 450ms ease ${220 + index * 140}ms`,
                          zIndex: 1,
                          "@media (prefers-reduced-motion: reduce)": {
                            boxShadow: `0 0 0 6px ${alpha(BRAND_ACCENT, 0.16)}`,
                            transition: "none",
                          },
                        }}
                      />
                    </Box>
                    <Box sx={{ width: "100%" }}>
                      <StepBody title={step.title} body={step.body} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
