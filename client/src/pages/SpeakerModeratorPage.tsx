import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Stack,
  Tab,
  Tabs,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { socket } from "../socket";
import type { SpeakerQuestionItem, SpeakerQuestionsPayload } from "../types/speakerQuestions";
import { speakerQuestionRecipientLabel } from "../features/speakerQuestions/speakerTargetUi";
import {
  SessionTabLabel,
  SPEAKER_SESSION_TABS_SX,
} from "../features/speakerQuestions/SessionTabLabel";
import {
  resolveSpeakerSessionTab,
  writeSpeakerSessionTab,
} from "../features/speakerQuestions/speakerSessionTabPersistence";
import {
  readModeratorAnsweredIds,
  sortModeratorQuestionsByAnswered,
  writeModeratorAnsweredIds,
} from "../features/speakerQuestions/moderatorAnsweredQuestions";
import {
  buildModeratorDocumentTitle,
  buildModeratorHeading,
} from "../features/speakerQuestions/speakerModeratorPageTitles";
import { buildReportTheme } from "../features/report/buildReportTheme";
import { useBrandFont } from "../hooks/useBrandFont";
import { useBodyBrandBackground } from "../hooks/useBodyBrandBackground";
import { useEventFavicon } from "../hooks/useEventFavicon";
import { useQuizPlayMetaBranding } from "../hooks/useQuizPlayMetaBranding";

const ALL_TAB = "__all__";

function formatReactionCounts(counts: Record<string, number> | undefined): string | null {
  if (!counts) return null;
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([emoji, n]) => `${emoji} ${n}`);
  return parts.length > 0 ? parts.join("  ") : null;
}

export function SpeakerModeratorPage() {
  const { slug = "" } = useParams();
  const [payload, setPayload] = useState<SpeakerQuestionsPayload | null>(null);
  const [sessionTab, setSessionTab] = useState("");
  const [error, setError] = useState("");
  const [connectionOnline, setConnectionOnline] = useState(() => socket.connected);
  const [answeredIds, setAnsweredIds] = useState<string[]>(() => readModeratorAnsweredIds(slug));
  const tabScope = `mod:${slug}`;
  const {
    titleText,
    brandPrimaryColor,
    brandTextColor,
    formBackgroundColor,
    brandSurfaceColor,
    brandLogoUrl,
    brandFontFamily,
    brandFontUrl,
    brandFontUrls,
  } = useQuizPlayMetaBranding({ slug, quiz: null });
  const heading = buildModeratorHeading(titleText);
  const documentTitle = buildModeratorDocumentTitle(titleText);
  const answeredSet = useMemo(() => new Set(answeredIds), [answeredIds]);

  useBrandFont(brandFontFamily, brandFontUrl || undefined, brandFontUrls);
  useEventFavicon(brandLogoUrl);
  useBodyBrandBackground({
    backgroundColor: brandSurfaceColor,
    clearRootBackground: true,
  });

  const pageTheme = useMemo(
    () =>
      buildReportTheme({
        brandPrimaryColor,
        brandAccentColor: formBackgroundColor,
        brandSurfaceColor,
        brandTextColor,
        brandFontFamily,
        brandBodyBackgroundColor: brandSurfaceColor,
      }),
    [brandPrimaryColor, formBackgroundColor, brandSurfaceColor, brandTextColor, brandFontFamily],
  );

  const onUpdate = useCallback((next: SpeakerQuestionsPayload) => {
    setPayload(next);
    setError("");
  }, []);

  useEffect(() => {
    setAnsweredIds(readModeratorAnsweredIds(slug));
  }, [slug]);

  const markAnswered = useCallback(
    (id: string) => {
      setAnsweredIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        writeModeratorAnsweredIds(slug, next);
        return next;
      });
    },
    [slug],
  );

  const restoreAnswered = useCallback(
    (id: string) => {
      setAnsweredIds((prev) => {
        const next = prev.filter((x) => x !== id);
        writeModeratorAnsweredIds(slug, next);
        return next;
      });
    },
    [slug],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!slug.trim()) return;
    const onError = (err: { message?: string }) => {
      setError(err?.message ?? "Ошибка сокета");
    };
    const syncConnection = () => setConnectionOnline(socket.connected);
    const onConnectError = () => setConnectionOnline(false);
    socket.on("speaker:questions:update", onUpdate);
    socket.on("error:message", onError);
    socket.on("connect", syncConnection);
    socket.on("disconnect", syncConnection);
    socket.on("connect_error", onConnectError);
    if (!socket.connected) socket.connect();
    const subscribe = () => {
      syncConnection();
      socket.emit("speaker:questions:subscribe", { slug, viewer: "moderator" });
    };
    if (socket.connected) subscribe();
    else socket.once("connect", subscribe);
    socket.on("reconnect", subscribe);
    syncConnection();
    return () => {
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onError);
      socket.off("connect", syncConnection);
      socket.off("disconnect", syncConnection);
      socket.off("connect_error", onConnectError);
      socket.off("reconnect", subscribe);
      socket.off("connect", subscribe);
    };
  }, [slug, onUpdate]);

  const sessions = payload?.settings.sessions ?? [];
  const items = payload?.items ?? [];
  const visiblePool = useMemo(() => {
    const showAll = payload?.settings.moderatorShowAll === true;
    return items.filter((q) => (showAll ? true : q.status === "APPROVED"));
  }, [items, payload?.settings.moderatorShowAll]);

  const tabs = useMemo(() => {
    const fromSettings = sessions.map((s) => ({ id: s.id, name: s.name }));
    const known = new Set(fromSettings.map((s) => s.id));
    const extras: { id: string; name: string }[] = [];
    for (const q of items) {
      if (q.sessionId && !known.has(q.sessionId)) {
        known.add(q.sessionId);
        extras.push({ id: q.sessionId, name: q.sessionName || q.sessionId });
      }
    }
    return [...fromSettings, ...extras, { id: ALL_TAB, name: "Все" }];
  }, [items, sessions]);

  const countsByTab = useMemo(() => {
    const map = new Map<string, number>();
    map.set(ALL_TAB, visiblePool.length);
    for (const tab of tabs) {
      if (tab.id === ALL_TAB) continue;
      map.set(tab.id, 0);
    }
    for (const q of visiblePool) {
      if (!q.sessionId) continue;
      map.set(q.sessionId, (map.get(q.sessionId) ?? 0) + 1);
    }
    return map;
  }, [visiblePool, tabs]);

  const tabsReady = payload != null;

  const activeTab = useMemo(() => {
    if (!tabsReady) {
      return tabs.find((t) => t.id !== ALL_TAB)?.id ?? tabs[0]?.id ?? ALL_TAB;
    }
    return resolveSpeakerSessionTab(
      tabs.map((t) => t.id),
      sessionTab,
      tabScope,
      tabs[0]?.id ?? ALL_TAB,
    );
  }, [tabsReady, tabs, sessionTab, tabScope]);

  useEffect(() => {
    if (!tabsReady || !tabs.length) return;
    if (sessionTab !== activeTab) setSessionTab(activeTab);
  }, [tabsReady, tabs, sessionTab, activeTab]);

  const visibleItems = useMemo(() => {
    const filtered =
      activeTab === ALL_TAB ? visiblePool : visiblePool.filter((q) => q.sessionId === activeTab);
    return sortModeratorQuestionsByAnswered(filtered, answeredSet);
  }, [visiblePool, activeTab, answeredSet]);

  const { activeQuestions, answeredQuestions } = useMemo(() => {
    const active: SpeakerQuestionItem[] = [];
    const answered: SpeakerQuestionItem[] = [];
    for (const q of visibleItems) {
      if (answeredSet.has(q.id)) answered.push(q);
      else active.push(q);
    }
    return { activeQuestions: active, answeredQuestions: answered };
  }, [visibleItems, answeredSet]);

  return (
    <ThemeProvider theme={pageTheme}>
      <CssBaseline />
      <Box
        sx={{
          position: "relative",
          backgroundColor: brandSurfaceColor,
          backgroundImage: "none",
          height: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
          py: { xs: 2, sm: 3 },
          boxSizing: "border-box",
          fontFamily: brandFontFamily,
          color: brandTextColor,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Chip
          size="small"
          label={connectionOnline ? "Онлайн" : "Оффлайн"}
          color={connectionOnline ? "success" : "error"}
          variant={connectionOnline ? "filled" : "outlined"}
          sx={{
            position: "absolute",
            top: { xs: 12, sm: 16 },
            right: { xs: 12, sm: 16 },
            zIndex: 2,
            fontWeight: 700,
            ...(connectionOnline
              ? {
                  bgcolor: brandPrimaryColor,
                  color: "primary.contrastText",
                  "& .MuiChip-label": { color: "primary.contrastText" },
                }
              : {}),
          }}
        />
        <Container
          maxWidth="md"
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Stack spacing={2} sx={{ flexShrink: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontFamily: brandFontFamily }}>
              {heading}
            </Typography>
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}
            <Tabs
              value={activeTab}
              onChange={(_, v: string) => {
                setSessionTab(v);
                writeSpeakerSessionTab(tabScope, v);
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              textColor="inherit"
              sx={{
                ...SPEAKER_SESSION_TABS_SX,
                width: "100%",
                maxWidth: "100%",
                color: brandTextColor,
                "& .MuiTab-root": {
                  ...SPEAKER_SESSION_TABS_SX["& .MuiTab-root"],
                  color: "text.secondary",
                  fontFamily: brandFontFamily,
                },
                "& .Mui-selected": {
                  color: brandTextColor,
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: brandPrimaryColor,
                },
                "& .MuiTabs-scrollButtons": {
                  color: brandTextColor,
                },
              }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={<SessionTabLabel name={tab.name} count={countsByTab.get(tab.id) ?? 0} />}
                />
              ))}
            </Tabs>
          </Stack>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              mt: 2,
              pr: 0.5,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {visibleItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Пока нет вопросов
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {activeQuestions.map((q) => (
                  <ModeratorQuestionCard
                    key={q.id}
                    question={q}
                    answered={false}
                    onToggleAnswered={() => markAnswered(q.id)}
                  />
                ))}
                {answeredQuestions.length > 0 ? (
                  <Divider
                    sx={{
                      my: 0.5,
                      borderColor: "divider",
                      "&::before, &::after": {
                        borderColor: "divider",
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        px: 1,
                        letterSpacing: 0.4,
                        textTransform: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Отработанные вопросы
                    </Typography>
                  </Divider>
                ) : null}
                {answeredQuestions.map((q) => (
                  <ModeratorQuestionCard
                    key={q.id}
                    question={q}
                    answered
                    onToggleAnswered={() => restoreAnswered(q.id)}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

function ModeratorQuestionCard({
  question,
  answered,
  onToggleAnswered,
}: {
  question: SpeakerQuestionItem;
  answered: boolean;
  onToggleAnswered: () => void;
}) {
  const reactions = formatReactionCounts(question.reactionCounts);
  return (
    <Card
      variant="outlined"
      sx={{
        opacity: answered ? 0.45 : 1,
        transition: "opacity 0.2s ease",
        bgcolor: "background.paper",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" component="p" sx={{ whiteSpace: "pre-wrap", fontWeight: 600 }}>
            {question.text}
          </Typography>
          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
              {speakerQuestionRecipientLabel(question.speakerName)}
            </Typography>
            {reactions ? (
              <Typography variant="body2" sx={{ flexShrink: 0 }}>
                {reactions}
              </Typography>
            ) : null}
          </Stack>
          <Button
            size="small"
            variant={answered ? "outlined" : "contained"}
            color="primary"
            onClick={onToggleAnswered}
            sx={{ alignSelf: "flex-end" }}
          >
            {answered ? "Вернуть" : "Отвечено"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
