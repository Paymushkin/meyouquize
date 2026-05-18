import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { Box, Fade, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import type { ProjectorLeader } from "../../types/projectorDashboard";

export type ProjectorLeaderboardTableProps = {
  leaders: ProjectorLeader[];
  /** Сколько верхних строк подсвечивать как «победителей» (кубок и фон). */
  winnersRowsCount: number;
  /** Ключ для анимации Fade при обновлении лидерборда. */
  fadeKey: number;
  maxContentWidth?: number;
  brandPrimaryColor: string;
  /**
   * Встраивание в ограниченный блок (превью на лендинге):
   * без minHeight: 100dvh; уменьшенные шрифты, отступы и толщина рамки строк.
   * Анимация появления строк — та же, что на полноэкранном проекторе.
   */
  embedded?: boolean;
};

export function ProjectorLeaderboardTable(props: ProjectorLeaderboardTableProps) {
  const {
    leaders,
    winnersRowsCount,
    fadeKey,
    maxContentWidth = 1920,
    brandPrimaryColor,
    embedded = false,
  } = props;
  const [revealedFromBottom, setRevealedFromBottom] = useState(0);

  /** Превью на лендинге: меньше шрифты и отступы (без CSS scale). */
  const c = embedded
    ? {
        outerPx: { xs: 0.5, sm: 0.75 } as const,
        outerPy: { xs: 0.35, sm: 0.5 } as const,
        listSpacing: 0.55,
        headerRowPx: { xs: 0.5, sm: 0.65 } as const,
        headerColMinW: { xs: 52, sm: 62 } as const,
        balyPx: { xs: 0.75, sm: 1 } as const,
        balyFont: { xs: "0.65rem", sm: "0.72rem" } as const,
        rowSpacing: 0.65,
        rowMinH: { xs: 30, sm: 34 } as const,
        rowPx: { xs: 0.75, sm: 0.9 } as const,
        rowPy: { xs: 0.4, sm: 0.45 } as const,
        rowBorder: "1px solid",
        leftClusterGap: 0.6,
        rankWh: { xs: 22, sm: 26 } as const,
        rankFont: { xs: "0.68rem", sm: "0.78rem" } as const,
        trophy: { xs: 16, sm: 18 } as const,
        nickFont: { xs: "0.78rem", sm: "0.95rem" } as const,
        rightPl: { xs: 0.75, sm: 1 } as const,
        rightMinW: { xs: 52, sm: 60 } as const,
        rightInnerGap: 0.45,
        timeFont: { xs: "0.65rem", sm: "0.72rem" } as const,
        scoreMinW: { xs: 38, sm: 42 } as const,
        scorePx: { xs: 0.85, sm: 1 } as const,
        scorePy: { xs: 0.35, sm: 0.4 } as const,
        scoreFont: { xs: "0.78rem", sm: "0.92rem" } as const,
      }
    : {
        outerPx: { xs: 2, sm: 3 } as const,
        outerPy: { xs: 2, sm: 2.5 } as const,
        listSpacing: 1.2,
        headerRowPx: { xs: 1, sm: 1.25 } as const,
        headerColMinW: { xs: 96, sm: 120 } as const,
        balyPx: { xs: 2, sm: 2.5 } as const,
        balyFont: { xs: "0.875rem", sm: "1rem" } as const,
        rowSpacing: 1.25,
        rowMinH: { xs: 58, sm: 66 } as const,
        rowPx: { xs: 1.5, sm: 1.75 } as const,
        rowPy: { xs: 1, sm: 1.1 } as const,
        rowBorder: "2px solid",
        leftClusterGap: 1.2,
        rankWh: { xs: 42, sm: 48 } as const,
        rankFont: { xs: "1.15rem", sm: "1.35rem" } as const,
        trophy: { xs: 34, sm: 38 } as const,
        nickFont: { xs: "1.5rem", sm: "2rem" } as const,
        rightPl: { xs: 2, sm: 2.5 } as const,
        rightMinW: { xs: 96, sm: 120 } as const,
        rightInnerGap: 1,
        timeFont: { xs: "0.95rem", sm: "1.05rem" } as const,
        scoreMinW: { xs: 72, sm: 84 } as const,
        scorePx: { xs: 2, sm: 2.5 } as const,
        scorePy: { xs: 0.9, sm: 1.0 } as const,
        scoreFont: { xs: "1.5rem", sm: "2rem" } as const,
      };

  const pad2 = (n: number) => String(n).padStart(2, "0");
  function formatMsAsCompact(valueMs: number): string {
    const v = Math.max(0, Math.floor(valueMs));
    const totalSec = Math.floor(v / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const cs = Math.floor((v % 1000) / 10); // centiseconds (2 digits)
    return mm > 0 ? `${mm}:${pad2(ss)}.${pad2(cs)}` : `${ss}.${pad2(cs)}`;
  }
  function formatDeltaMsAsPlusCompact(deltaMs: number): string {
    const v = Math.max(0, Math.floor(deltaMs));
    const totalSec = Math.floor(v / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const cs = Math.floor((v % 1000) / 10);
    return mm > 0 ? `+${mm}:${pad2(ss)}.${pad2(cs)}` : `+${ss}.${pad2(cs)}`;
  }

  useEffect(() => {
    if (leaders.length === 0) return;
    setRevealedFromBottom(0);
    const timer = window.setInterval(() => {
      setRevealedFromBottom((prev) => {
        if (prev >= leaders.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [fadeKey, leaders.length]);

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        bgcolor: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        ...(embedded
          ? {
              height: "100%",
              minHeight: 0,
              flex: 1,
              maxWidth: "none",
              mx: 0,
              px: c.outerPx,
              py: c.outerPy,
            }
          : {
              minHeight: "100dvh",
              maxWidth: maxContentWidth,
              mx: "auto",
              px: c.outerPx,
              py: c.outerPy,
            }),
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          boxSizing: "border-box",
          ...(embedded ? { flex: 1, minHeight: 0 } : {}),
        }}
      >
        <Fade in key={`leaders-${fadeKey}`} timeout={350}>
          <Box
            sx={{
              width: embedded ? "100%" : "min(100%, 1380px)",
              maxWidth: embedded ? "none" : 1380,
              boxSizing: "border-box",
              ...(embedded
                ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }
                : {}),
            }}
          >
            <Stack
              spacing={c.listSpacing}
              aria-label="Таблица результатов"
              role="list"
              sx={
                embedded
                  ? { flex: 1, minHeight: 0, justifyContent: "center", overflow: "auto" }
                  : undefined
              }
            >
              <Stack
                direction="row"
                alignItems="flex-end"
                justifyContent="space-between"
                sx={{ px: c.headerRowPx }}
              >
                <Box sx={{ flex: 1 }} />
                <Stack
                  direction="row"
                  alignItems="baseline"
                  justifyContent="center"
                  spacing={0}
                  sx={{ minWidth: c.headerColMinW }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      px: c.balyPx,
                      textAlign: "center",
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: "rgba(255,255,255,0.78)",
                      fontSize: c.balyFont,
                    }}
                  >
                    Баллы
                  </Typography>
                </Stack>
              </Stack>
              {leaders.map((l, index) => {
                const isWinner = index < winnersRowsCount;
                const prev = index > 0 ? leaders[index - 1] : undefined;
                const isSameScoreAsPrev = Boolean(prev && prev.score === l.score);
                const timeText = isSameScoreAsPrev
                  ? formatDeltaMsAsPlusCompact(l.totalResponseMs - prev!.totalResponseMs)
                  : formatMsAsCompact(l.totalResponseMs);
                const timeDisplay = isSameScoreAsPrev ? timeText : `${timeText} сек.`;
                const isRevealed = index >= Math.max(0, leaders.length - revealedFromBottom);
                return (
                  <Stack
                    key={l.participantId}
                    role="listitem"
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={c.rowSpacing}
                    sx={(theme) => ({
                      minHeight: c.rowMinH,
                      px: c.rowPx,
                      py: c.rowPy,
                      borderRadius: 999,
                      border: c.rowBorder,
                      borderColor: alpha(theme.palette.common.white, isWinner ? 0.5 : 0.3),
                      bgcolor: alpha(theme.palette.common.black, isWinner ? 0.68 : 0.58),
                      boxShadow: isWinner
                        ? `0 0 0 1px ${alpha(theme.palette.warning.main, 0.2)}`
                        : "none",
                      opacity: isRevealed ? 1 : 0.5,
                      transform: isRevealed ? "translateY(0)" : `translateY(${embedded ? 3 : 6}px)`,
                      transition: "opacity 220ms ease, transform 220ms ease",
                    })}
                  >
                    <Stack
                      direction="row"
                      spacing={c.leftClusterGap}
                      alignItems="center"
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Box
                        sx={{
                          width: c.rankWh,
                          height: c.rankWh,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: brandPrimaryColor,
                          color: "#111",
                          fontWeight: 800,
                          fontSize: c.rankFont,
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
                            fontSize: c.trophy,
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
                          fontSize: c.nickFont,
                          lineHeight: 1.05,
                          color: "#fff",
                        }}
                      >
                        {isRevealed ? l.nickname : "---"}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      spacing={c.rightInnerGap}
                      sx={{
                        flexShrink: 0,
                        pl: c.rightPl,
                        pr: 0,
                        minWidth: c.rightMinW,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: c.timeFont,
                          lineHeight: 1.1,
                          color: "rgba(255,255,255,0.72)",
                          opacity: isSameScoreAsPrev ? 0.62 : 0.95,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isRevealed ? timeDisplay : "…"}
                      </Typography>
                      <Box
                        sx={{
                          width: "fit-content",
                          minWidth: c.scoreMinW,
                          px: c.scorePx,
                          py: c.scorePy,
                          borderRadius: 999,
                          bgcolor: brandPrimaryColor,
                          color: "#111",
                          textAlign: "center",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: c.scoreFont,
                          lineHeight: 1,
                        }}
                      >
                        {isRevealed ? l.score : "?"}
                      </Box>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
