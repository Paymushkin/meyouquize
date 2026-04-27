import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type ProjectorFirstCorrectHeroProps = {
  questionText: string;
  /** Цвет текста вопроса и блока победителей (брендирование «голосование»). */
  textColor: string;
  winnerNames: string[];
};

/**
 * Экран «кто первым ответил верно» на проекторе — один и тот же для голосования столбиками и облака тегов.
 */
export function ProjectorFirstCorrectHero(props: ProjectorFirstCorrectHeroProps) {
  const { questionText, textColor, winnerNames } = props;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "min(92vw, 640px)",
        mx: "auto",
        px: { xs: 1.5, sm: 2 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography
        variant="h6"
        align="center"
        sx={{
          fontWeight: 600,
          mb: 2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: textColor,
          opacity: 0.75,
        }}
      >
        {questionText}
      </Typography>
      <Paper
        elevation={0}
        sx={{
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 5 },
          borderRadius: 4,
          textAlign: "center",
          border: "1px solid",
          borderColor: (theme) => alpha(textColor, theme.palette.mode === "dark" ? 0.28 : 0.22),
          bgcolor: "transparent",
          boxShadow: "none",
        }}
      >
        <Stack alignItems="center" spacing={2.5}>
          <Box
            sx={{
              width: { xs: 72, sm: 96 },
              height: { xs: 72, sm: 96 },
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: (theme) =>
                `linear-gradient(145deg, ${alpha("#ffc107", theme.palette.mode === "dark" ? 0.35 : 0.5)} 0%, ${alpha("#ff9800", theme.palette.mode === "dark" ? 0.22 : 0.35)} 100%)`,
              border: "2px solid",
              borderColor: (theme) => alpha("#ffb300", theme.palette.mode === "dark" ? 0.65 : 0.85),
              boxShadow: `0 8px 24px ${alpha("#ff9800", 0.35)}`,
            }}
          >
            <EmojiEventsIcon
              sx={{
                fontSize: { xs: 40, sm: 52 },
                color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#f57c00"),
              }}
            />
          </Box>
          <Typography
            variant="overline"
            sx={{
              letterSpacing: "0.22em",
              fontWeight: 700,
              color: textColor,
              opacity: 0.8,
            }}
          >
            {winnerNames.length === 1
              ? "Первый верно ответил"
              : `Первые верно ответившие · ${winnerNames.length}`}
          </Typography>
          {winnerNames.length === 1 ? (
            <Typography
              variant="h3"
              align="center"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                wordBreak: "break-word",
                color: textColor,
              }}
            >
              {winnerNames[0]}
            </Typography>
          ) : (
            <Stack spacing={1.25} sx={{ width: "100%" }}>
              {winnerNames.map((name, i) => (
                <Box
                  key={`${i}-${name}`}
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    component="span"
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      color: textColor,
                      opacity: 0.65,
                      minWidth: "1.25em",
                    }}
                  >
                    {i + 1}.
                  </Typography>
                  <Typography
                    component="span"
                    variant="h4"
                    sx={{ fontWeight: 700, wordBreak: "break-word", color: textColor }}
                  >
                    {name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
