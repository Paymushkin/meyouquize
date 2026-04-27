import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { Box, Stack, Typography } from "@mui/material";
import type { PublicViewState } from "@meyouquize/shared";
import {
  RANDOMIZER_WINNER_HOLD_MS,
  useRandomizerAnimation,
} from "../../hooks/useRandomizerAnimation";

type Props = {
  view: PublicViewState;
};

export function ProjectorRandomizerSection({ view }: Props) {
  const { rollingMask, settlingIndex, focusedWinnerIndex, focusedWinner, revealedWinnerRows } =
    useRandomizerAnimation(view);

  return (
    <Stack
      spacing={3}
      sx={{
        minHeight: "100dvh",
        width: "100%",
        px: { xs: 3, md: 6 },
        py: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {view.randomizerTitle?.trim() ? (
        <Typography
          variant="h3"
          align="center"
          sx={{
            color: view.voteQuestionTextColor,
            fontWeight: 700,
            fontFamily: view.brandFontFamily,
          }}
        >
          {view.randomizerTitle.trim()}
        </Typography>
      ) : null}
      <Stack
        spacing={2}
        sx={{
          width: "100%",
          maxWidth: 1240,
          alignSelf: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            borderRadius: 2.5,
            border: "2px solid",
            borderColor: view.brandPrimaryColor,
            bgcolor: "rgba(0,0,0,0.28)",
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.5 },
          }}
        >
          <Stack spacing={2}>
            {focusedWinnerIndex < 0 ? (
              <Typography
                variant="h5"
                sx={{
                  color: view.voteOptionTextColor,
                  opacity: 0.85,
                  fontFamily: view.brandFontFamily,
                  py: 7,
                  textAlign: "center",
                }}
              >
                Ожидание выбора
              </Typography>
            ) : (
              <Box
                sx={{
                  px: { xs: 2, md: 3.5 },
                  py: { xs: 2, md: 3.2 },
                  borderRadius: 2,
                  border: "2px solid",
                  borderColor: view.brandPrimaryColor,
                  bgcolor: rollingMask[focusedWinnerIndex]
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: rollingMask[focusedWinnerIndex]
                    ? `0 0 24px ${view.brandPrimaryColor}55`
                    : settlingIndex === focusedWinnerIndex
                      ? `0 0 30px ${view.brandPrimaryColor}88`
                      : "0 8px 20px rgba(0,0,0,0.22)",
                  transition: "box-shadow 240ms ease, background-color 240ms ease",
                  minHeight: { xs: 140, md: 220 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h2"
                  sx={{
                    display: "inline-block",
                    position: "relative",
                    fontWeight: 800,
                    fontSize: { xs: "2.2rem", md: "4rem" },
                    letterSpacing: 0.3,
                    color: view.voteOptionTextColor,
                    fontFamily: view.brandFontFamily,
                    textAlign: "center",
                    pb: { xs: 0.45, md: 0.6 },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: { xs: 3, md: 4 },
                      borderRadius: 999,
                      backgroundColor: view.brandAccentColor,
                      boxShadow: `0 0 12px ${view.brandAccentColor}AA`,
                      transformOrigin: "left center",
                      transform: settlingIndex === focusedWinnerIndex ? "scaleX(0)" : "scaleX(1)",
                      opacity: settlingIndex === focusedWinnerIndex ? 1 : 0,
                      animation:
                        settlingIndex === focusedWinnerIndex
                          ? `randomizerWinnerUnderline ${RANDOMIZER_WINNER_HOLD_MS}ms linear forwards`
                          : "none",
                    },
                    "@keyframes randomizerWinnerUnderline": {
                      "0%": { transform: "scaleX(0)", opacity: 1 },
                      "92%": { transform: "scaleX(1)", opacity: 1 },
                      "100%": { transform: "scaleX(1)", opacity: 0.9 },
                    },
                  }}
                >
                  {focusedWinner}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                borderTop: "1px solid rgba(255,255,255,0.16)",
                pt: 1.5,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1,
                  color: view.voteQuestionTextColor,
                  fontWeight: 700,
                  fontFamily: view.brandFontFamily,
                  textAlign: "center",
                }}
              >
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
                >
                  <EmojiEventsIcon sx={{ fontSize: "1.1em", color: view.brandAccentColor }} />
                  <Box component="span">все победители</Box>
                </Box>
              </Typography>
              {revealedWinnerRows.length === 0 ? (
                <Typography
                  variant="body1"
                  sx={{
                    color: view.voteOptionTextColor,
                    opacity: 0.8,
                    fontFamily: view.brandFontFamily,
                    textAlign: "center",
                  }}
                >
                  Пока нет победителей
                </Typography>
              ) : (
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="center"
                  sx={{ width: "100%" }}
                >
                  {revealedWinnerRows.map((row) => (
                    <Box
                      key={`${row.idx}:${row.winner}`}
                      sx={{
                        borderRadius: 999,
                        px: 2,
                        py: 1.5,
                        bgcolor: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        maxWidth: { xs: "100%", md: 360 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0,
                        transform: "translateY(-54px) scale(0.92)",
                        animation:
                          "randomizerWinnerDrop 640ms cubic-bezier(0.22, 0.9, 0.28, 1) forwards",
                        animationDelay: "0ms",
                        "@keyframes randomizerWinnerDrop": {
                          "0%": {
                            opacity: 0,
                            transform: "translateY(-54px) scale(0.92)",
                          },
                          "68%": {
                            opacity: 1,
                            transform: "translateY(6px) scale(1.03)",
                          },
                          "100%": {
                            opacity: 1,
                            transform: "translateY(0) scale(1)",
                          },
                        },
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          color: view.voteOptionTextColor,
                          fontWeight: 700,
                          fontFamily: view.brandFontFamily,
                          lineHeight: 1,
                          wordBreak: "break-word",
                          textAlign: "center",
                        }}
                      >
                        {row.winner}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
}
