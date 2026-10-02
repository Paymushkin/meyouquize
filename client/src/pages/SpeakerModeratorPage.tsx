import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { API_BASE } from "../config";
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
  const [eventTitle, setEventTitle] = useState("");
  const [error, setError] = useState("");
  const [answeredIds, setAnsweredIds] = useState<string[]>(() => readModeratorAnsweredIds(slug));
  const tabScope = `mod:${slug}`;
  const heading = buildModeratorHeading(eventTitle);
  const documentTitle = buildModeratorDocumentTitle(eventTitle);
  const answeredSet = useMemo(() => new Set(answeredIds), [answeredIds]);

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
    if (!slug.trim()) {
      setEventTitle("");
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/quiz/by-slug/${encodeURIComponent(slug)}/meta`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { title?: string };
        if (typeof data.title === "string") setEventTitle(data.title);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    })();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug.trim()) return;
    const onError = (err: { message?: string }) => {
      setError(err?.message ?? "Ошибка сокета");
    };
    socket.on("speaker:questions:update", onUpdate);
    socket.on("error:message", onError);
    if (!socket.connected) socket.connect();
    const subscribe = () => {
      socket.emit("speaker:questions:subscribe", { slug, viewer: "moderator" });
    };
    if (socket.connected) subscribe();
    else socket.once("connect", subscribe);
    socket.on("reconnect", subscribe);
    return () => {
      socket.off("speaker:questions:update", onUpdate);
      socket.off("error:message", onError);
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
    <Box sx={{ minHeight: "100dvh", py: { xs: 2, sm: 3 } }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography variant="h5" component="h1">
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
            textColor="inherit"
            sx={SPEAKER_SESSION_TABS_SX}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={<SessionTabLabel name={tab.name} count={countsByTab.get(tab.id) ?? 0} />}
              />
            ))}
          </Tabs>
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
                    borderColor: "rgba(255,255,255,0.28)",
                    "&::before, &::after": {
                      borderColor: "rgba(255,255,255,0.28)",
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      color: "rgba(255,255,255,0.65)",
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
        </Stack>
      </Container>
    </Box>
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
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" component="p" sx={{ whiteSpace: "pre-wrap", fontWeight: 600 }}>
            {question.text}
          </Typography>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.18)" }} />
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
