import { Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectorLeaderboardTable } from "../components/projector/ProjectorLeaderboardTable";
import { ProjectorQuestionSection } from "../components/projector/ProjectorQuestionSection";
import { useResultsProjectorSession } from "../hooks/useResultsProjectorSession";
import { buildBrandBackground } from "../features/branding/brandVisual";
import { useBrandFont } from "../hooks/useBrandFont";
import { useEventFavicon } from "../hooks/useEventFavicon";
import "../styles/adminProjectorBody.css";

type ReactionBurst = {
  id: string;
  emoji: string;
  bornAtMs: number;
  durationMs: number;
  sizePx: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  swayAmpPx: number;
  swayFreq: number;
  phase: number;
};

function speakerTargetLabel(speakerName: string): string {
  return speakerName === "Все спикеры" ? "кому: всем спикерам" : `кому: ${speakerName}`;
}

/** Проектор: заголовок ивента, лидерборд, вопрос (облако / голосование / герой «первые верные»). */
export function ResultsPage() {
  const { slug = "" } = useParams();
  const p = useResultsProjectorSession(slug);
  const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
  const [nowMs, setNowMs] = useState(0);
  const prevCountsRef = useRef<Record<string, number>>({});
  const initializedReactionSessionIdRef = useRef<string | null>(null);

  const {
    quizTitle,
    view,
    resultsAnimationTick,
    leadersShown,
    winnersRowsCount,
    showEventTitleScreen,
    selectedQuestion,
    fullScreenCloud,
    fullScreenContainer,
    barQuestionCentered,
    showProjectorWinnersHero,
    isTagCloudQuestion,
    firstCorrectWinnersShown,
    speakerQuestions,
    reactionSession,
  } = p;
  const reactionList = reactionSession?.reactions ?? ["👍", "👏", "🔥", "🤔"];

  useEffect(() => {
    if (!reactionSession?.isActive) {
      prevCountsRef.current = {};
      initializedReactionSessionIdRef.current = null;
      setReactionBursts([]);
      return;
    }
    if (initializedReactionSessionIdRef.current !== reactionSession.id) {
      const seeded: Record<string, number> = {};
      for (const reaction of reactionList) {
        seeded[reaction] = reactionSession.counts[reaction] ?? 0;
      }
      prevCountsRef.current = seeded;
      initializedReactionSessionIdRef.current = reactionSession.id;
      return;
    }
    const prev = prevCountsRef.current;
    const next = reactionSession.counts;
    const burstRows: Array<{ emoji: string; count: number }> = reactionList.map((reaction) => ({
      emoji: reaction,
      count: Math.min(Math.max(0, (next[reaction] ?? 0) - (prev[reaction] ?? 0)), 6),
    }));
    const nextPrev: Record<string, number> = {};
    for (const reaction of reactionList) {
      nextPrev[reaction] = next[reaction] ?? 0;
    }
    prevCountsRef.current = nextPrev;
    const nextBursts: ReactionBurst[] = [];
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 720;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    burstRows.forEach((row) => {
      for (let i = 0; i < row.count; i += 1) {
        const startX = Math.floor(Math.random() * viewportW);
        const startY = viewportH + 24 + Math.floor(Math.random() * 24);
        const driftX = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.floor(Math.random() * 260));
        const endX = Math.max(24, Math.min(viewportW - 24, startX + driftX));
        const endY = -80 - Math.floor(Math.random() * 140);
        nextBursts.push({
          id: `${Date.now()}_${row.emoji}_${i}_${Math.random().toString(36).slice(2, 7)}`,
          emoji: row.emoji,
          bornAtMs: now + Math.random() * 180,
          durationMs: 4200 + Math.floor(Math.random() * 2600),
          sizePx: 44 + Math.floor(Math.random() * 28),
          startX,
          startY,
          endX,
          endY,
          swayAmpPx: 18 + Math.floor(Math.random() * 36),
          swayFreq: 0.8 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    });
    if (nextBursts.length > 0) {
      setReactionBursts((prevBursts) => [...prevBursts, ...nextBursts]);
    }
  }, [reactionSession, reactionList]);

  useEffect(() => {
    if (reactionBursts.length === 0) return;
    let rafId = 0;
    const tick = () => {
      setNowMs(typeof performance !== "undefined" ? performance.now() : Date.now());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reactionBursts.length]);

  useEffect(() => {
    if (reactionBursts.length === 0) return;
    setReactionBursts((prev) => prev.filter((b) => nowMs - b.bornAtMs < b.durationMs));
  }, [nowMs, reactionBursts.length]);

  const containerContentMaxPx = 1920;
  const isFullScreenWidgetMode =
    view.mode === "leaderboard" || view.mode === "speaker_questions" || view.mode === "reactions";
  const projectorBrandBg = buildBrandBackground({
    backgroundImageUrl: view.brandProjectorBackgroundImageUrl,
    overlayColor: view.brandBackgroundOverlayColor,
  });
  useBrandFont(view.brandFontFamily, view.brandFontUrl);
  useEventFavicon(view.brandLogoUrl);
  const screenSpeakerQuestions = (speakerQuestions?.items ?? [])
    .filter((item) => item.isOnScreen)
    .slice(0, 10);

  return (
    <Container
      maxWidth={false}
      disableGutters={fullScreenContainer}
      sx={{
        ...projectorBrandBg,
        fontFamily: view.brandFontFamily,
        "& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiFormLabel-root":
          {
            fontFamily: view.brandFontFamily,
          },
        backgroundColor: view.projectorBackground,
        backgroundPosition: "left top",
        backgroundSize: "cover",
        ...(!fullScreenContainer
          ? {
              width: "100%",
              maxWidth: containerContentMaxPx,
              mx: "auto",
              px: { xs: 2, sm: 3 },
              boxSizing: "border-box",
            }
          : {}),
        ...(showEventTitleScreen
          ? {
              minHeight: "100vh",
              width: "100vw",
              maxWidth: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 0,
              px: 0,
              mx: 0,
            }
          : fullScreenCloud
            ? {
                minHeight: "100dvh",
                height: "100dvh",
                py: 0,
                px: 0,
                overflow: "hidden",
                maxWidth: "none",
                mx: 0,
              }
            : isFullScreenWidgetMode
              ? {
                  minHeight: "100dvh",
                  height: "100dvh",
                  py: 0,
                  px: 0,
                  overflow: "hidden",
                  maxWidth: "none",
                  mx: 0,
                }
              : barQuestionCentered ||
                  (view.mode === "question" && !fullScreenCloud && !isTagCloudQuestion)
                ? {
                    minHeight: "100dvh",
                    height: "100dvh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 0,
                    boxSizing: "border-box",
                  }
                : { py: 4 }),
      }}
    >
      {view.mode === "leaderboard" && leadersShown.length > 0 && (
        <ProjectorLeaderboardTable
          leaders={leadersShown}
          winnersRowsCount={winnersRowsCount}
          fadeKey={resultsAnimationTick}
          maxContentWidth={containerContentMaxPx}
          brandPrimaryColor={view.brandPrimaryColor}
        />
      )}
      {showEventTitleScreen && (
        <Stack
          spacing={2}
          sx={{
            minHeight: "100dvh",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 2,
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#fff",
              textShadow: "0 4px 20px rgba(0,0,0,0.28)",
            }}
          >
            {quizTitle}
          </Typography>
          {view.mode !== "title" && (
            <Typography
              variant="h6"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontWeight: 500,
                textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              }}
            >
              Ожидание данных для экрана
            </Typography>
          )}
        </Stack>
      )}
      {view.mode === "question" && selectedQuestion && (
        <ProjectorQuestionSection
          selectedQuestion={selectedQuestion}
          view={view}
          showProjectorWinnersHero={showProjectorWinnersHero}
          fullScreenCloud={fullScreenCloud}
          isTagCloudQuestion={isTagCloudQuestion}
          firstCorrectWinnersShown={firstCorrectWinnersShown}
        />
      )}
      {view.mode === "speaker_questions" && (
        <Stack
          spacing={0}
          sx={{ py: 4, width: "100%", minHeight: "100dvh", justifyContent: "center" }}
        >
          {screenSpeakerQuestions.map((item, idx, arr) => (
            <Fragment key={item.id}>
              <Card
                variant="outlined"
                sx={() => ({
                  bgcolor: "transparent",
                  backgroundImage: "none",
                  borderColor: "transparent",
                  borderWidth: 0,
                  boxShadow: "none",
                  overflow: "visible",
                  opacity: 0,
                  transform: "translateY(16px) scale(0.985)",
                  animation: "speakerQuestionEnter 560ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
                  animationDelay: `${Math.min(idx * 90, 450)}ms`,
                  "@keyframes speakerQuestionEnter": {
                    "0%": { opacity: 0, transform: "translateY(16px) scale(0.985)" },
                    "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
                  },
                })}
              >
                <CardContent
                  sx={{
                    py: 1.25,
                    px: 2.5,
                    minHeight: 140,
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "rgba(0, 0, 0, 0.16)",
                    borderRadius: 2,
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                  }}
                >
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        bgcolor: "transparent",
                        color: "#fff",
                        borderRadius: 3,
                        px: 0,
                        py: 0,
                        boxShadow: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#fff", fontWeight: 700, letterSpacing: 0.2 }}
                      >
                        {speakerTargetLabel(item.speakerName)}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          color: "#fff",
                          fontWeight: 400,
                          lineHeight: 1.14,
                          fontSize: { xs: "1.95rem", md: "2.7rem" },
                          whiteSpace: "pre-line",
                        }}
                      >
                        {item.text}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ px: 0.5 }}
                    >
                      {view.speakerQuestionsShowAuthorOnScreen ? (
                        <Typography variant="body2" sx={{ opacity: 0.9, color: "#fff" }}>
                          от {item.authorNickname}
                        </Typography>
                      ) : (
                        <Box />
                      )}
                      {view.speakerQuestionsShowLikesOnScreen ? (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          useFlexGap
                          flexWrap="wrap"
                          justifyContent="flex-end"
                        >
                          {Object.entries(item.reactionCounts ?? {})
                            .filter(([, count]) => count > 0)
                            .map(([reaction, count]) => (
                              <Box
                                key={`${item.id}_${reaction}`}
                                sx={{
                                  bgcolor: "transparent",
                                  border: `1px solid ${alpha("#fff", 0.5)}`,
                                  borderRadius: 999,
                                  px: 1,
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                                  {reaction} {count}
                                </Typography>
                              </Box>
                            ))}
                        </Stack>
                      ) : (
                        <Box />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              {idx < arr.length - 1 ? (
                <Box
                  sx={{
                    width: "100%",
                    height: 1.5,
                    my: 2.5,
                    bgcolor: "rgba(255, 255, 255, 0.25)",
                  }}
                />
              ) : null}
            </Fragment>
          ))}
        </Stack>
      )}
      {view.mode === "reactions" && (
        <Stack spacing={2} sx={{ py: 3, width: "100%", minHeight: "100dvh", position: "relative" }}>
          {view.reactionsOverlayText?.trim() ? (
            <Box
              sx={{
                position: "fixed",
                left: 0,
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
                pointerEvents: "none",
                px: 2,
              }}
            >
              <Typography
                align="center"
                sx={{
                  fontSize: { xs: "2.6rem", md: "4rem" },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  textShadow: "0 2px 14px rgba(0,0,0,0.35)",
                }}
              >
                {view.reactionsOverlayText}
              </Typography>
            </Box>
          ) : null}
          {reactionBursts.map((burst) => {
            const rawT = (nowMs - burst.bornAtMs) / burst.durationMs;
            const t = Math.max(0, Math.min(1, rawT));
            const baseX = burst.startX + (burst.endX - burst.startX) * t;
            const baseY = burst.startY + (burst.endY - burst.startY) * t;
            const sway =
              Math.sin(burst.phase + t * Math.PI * 2 * burst.swayFreq) *
              burst.swayAmpPx *
              (1 - t * 0.2);
            const x = baseX + sway;
            const y = baseY;
            const inFade = t < 0.08 ? t / 0.08 : 1;
            const outFade = t > 0.82 ? (1 - t) / 0.18 : 1;
            const opacity = Math.max(0, Math.min(1, inFade * outFade));
            const scale = 0.88 + t * 0.28;
            const rotateDeg =
              Math.sin(burst.phase * 0.6 + t * Math.PI * 2 * burst.swayFreq * 0.75) * 4;
            return (
              <Box
                key={burst.id}
                sx={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  pointerEvents: "none",
                  zIndex: 3,
                  willChange: "transform, opacity",
                  transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotateDeg}deg)`,
                  opacity,
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    display: "inline-block",
                    fontSize: `${burst.sizePx}px`,
                    lineHeight: 1,
                    filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.22))",
                  }}
                >
                  {burst.emoji}
                </Typography>
              </Box>
            );
          })}
          <Box
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              pb: { xs: 1.5, sm: 2.25 },
              px: 2,
              zIndex: 4,
              pointerEvents: "none",
            }}
          >
            <Stack
              direction="row"
              spacing={{ xs: 2, sm: 4 }}
              justifyContent="center"
              flexWrap="wrap"
              useFlexGap
            >
              {reactionList.map((reaction) => (
                <Typography
                  key={reaction}
                  sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, fontWeight: 700, lineHeight: 1 }}
                >
                  {reaction} {reactionSession?.counts[reaction] ?? 0}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </Container>
  );
}
