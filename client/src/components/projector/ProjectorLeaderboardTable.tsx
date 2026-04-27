import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { Box, Fade, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ProjectorLeader } from "../../types/projectorDashboard";

export type ProjectorLeaderboardTableProps = {
  leaders: ProjectorLeader[];
  /** Сколько верхних строк подсвечивать как «победителей» (кубок и фон). */
  winnersRowsCount: number;
  /** Ключ для анимации Fade при обновлении лидерборда. */
  fadeKey: number;
  maxContentWidth?: number;
  brandPrimaryColor: string;
};

export function ProjectorLeaderboardTable(props: ProjectorLeaderboardTableProps) {
  const { leaders, winnersRowsCount, fadeKey, maxContentWidth = 1920, brandPrimaryColor } = props;

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100dvh",
        maxWidth: maxContentWidth,
        boxSizing: "border-box",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
        bgcolor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Fade in key={`leaders-${fadeKey}`} timeout={350}>
        <Box sx={{ width: "100%", maxWidth: 1380 }}>
          <Stack spacing={1.2} aria-label="Таблица результатов" role="list">
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: { xs: 1, sm: 1.25 } }}
            >
              <Box sx={{ flex: 1 }} />
              <Typography
                variant="subtitle1"
                sx={{
                  minWidth: { xs: 96, sm: 120 },
                  px: { xs: 2, sm: 2.5 },
                  textAlign: "center",
                  fontWeight: 700,
                  opacity: 0.9,
                }}
              >
                Баллы
              </Typography>
            </Stack>
            {leaders.map((l, index) => {
              const isWinner = index < winnersRowsCount;
              return (
                <Stack
                  key={l.participantId}
                  role="listitem"
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1.25}
                  sx={(theme) => ({
                    minHeight: { xs: 58, sm: 66 },
                    px: { xs: 1.5, sm: 1.75 },
                    py: { xs: 1, sm: 1.1 },
                    borderRadius: 999,
                    border: "2px solid",
                    borderColor: alpha(theme.palette.common.white, isWinner ? 0.5 : 0.3),
                    bgcolor: alpha(theme.palette.common.black, isWinner ? 0.68 : 0.58),
                    boxShadow: isWinner
                      ? `0 0 0 1px ${alpha(theme.palette.warning.main, 0.2)}`
                      : "none",
                  })}
                >
                  <Stack
                    direction="row"
                    spacing={1.2}
                    alignItems="center"
                    sx={{ minWidth: 0, flex: 1 }}
                  >
                    <Box
                      sx={{
                        width: { xs: 42, sm: 48 },
                        height: { xs: 42, sm: 48 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: brandPrimaryColor,
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: { xs: "1.15rem", sm: "1.35rem" },
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Box>
                    {isWinner && (
                      <EmojiEventsIcon
                        sx={{
                          color: "#ffbf47",
                          fontSize: { xs: 34, sm: 38 },
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography
                      title={l.nickname}
                      sx={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: isWinner ? 700 : 600,
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                        lineHeight: 1.05,
                      }}
                    >
                      {l.nickname}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      minWidth: { xs: 96, sm: 120 },
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1, sm: 1.1 },
                      borderRadius: 999,
                      bgcolor: brandPrimaryColor,
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: { xs: "1.5rem", sm: "2rem" },
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {l.score}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Fade>
    </Box>
  );
}
