import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Stack, Tab, Tabs } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import type {
  AdminSpeakerQuestionsPanelActions,
  AdminSpeakerQuestionsSettingsValues,
} from "../../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import { SpeakerQuestionsTable } from "./SpeakerQuestionsTable";
import { AdminSpeakerSettingsPanel } from "./AdminSpeakerSettingsPanel";
import { useSpeakerQuestionsSplit } from "../../features/speakerQuestionsAdmin/useSpeakerQuestionsSplit";
import {
  SessionTabLabel,
  SPEAKER_SESSION_TABS_SX,
} from "../../features/speakerQuestions/SessionTabLabel";
import {
  resolveSpeakerSessionTab,
  writeSpeakerSessionTab,
} from "../../features/speakerQuestions/speakerSessionTabPersistence";

const ALL_TAB = "__all__";

type Props = {
  eventName: string;
  settings: AdminSpeakerQuestionsSettingsValues;
  panelActions: AdminSpeakerQuestionsPanelActions;
  questions: SpeakerQuestionItem[];
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onSetUserVisible: (id: string, next: boolean) => void;
  onSetOnScreen: (id: string, next: boolean) => void;
  onUpdateQuestionText: (id: string, text: string) => void;
  onDeleteQuestion: (id: string) => void;
};

function filterBySessionTab(rows: SpeakerQuestionItem[], tab: string): SpeakerQuestionItem[] {
  if (tab === ALL_TAB) return rows;
  return rows.filter((row) => row.sessionId === tab);
}

export function AdminSpeakersSection(props: Props) {
  const {
    eventName,
    settings,
    panelActions,
    questions,
    onHide,
    onRestore,
    onSetUserVisible,
    onSetOnScreen,
    onUpdateQuestionText,
    onDeleteQuestion,
  } = props;
  const { hidden, fresh } = useSpeakerQuestionsSplit(questions);
  const [sessionTab, setSessionTab] = useState("");
  const tabScope = `admin:${eventName}`;

  const tabs = useMemo(() => {
    const fromSettings = settings.sessions.map((s) => ({ id: s.id, name: s.name }));
    const knownIds = new Set(fromSettings.map((s) => s.id));
    const extras: { id: string; name: string }[] = [];
    for (const q of questions) {
      if (q.sessionId && !knownIds.has(q.sessionId)) {
        knownIds.add(q.sessionId);
        extras.push({ id: q.sessionId, name: q.sessionName || q.sessionId });
      }
    }
    return [...fromSettings, ...extras, { id: ALL_TAB, name: "Все" }];
  }, [questions, settings.sessions]);

  const countsByTab = useMemo(() => {
    const map = new Map<string, number>();
    map.set(ALL_TAB, fresh.length);
    for (const tab of tabs) {
      if (tab.id === ALL_TAB) continue;
      map.set(tab.id, 0);
    }
    for (const q of fresh) {
      if (!q.sessionId) continue;
      map.set(q.sessionId, (map.get(q.sessionId) ?? 0) + 1);
    }
    return map;
  }, [fresh, tabs]);

  const tabsReady = settings.sessions.length > 0 || questions.length > 0;

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

  const filteredFresh = filterBySessionTab(fresh, activeTab);
  const filteredHidden = filterBySessionTab(hidden, activeTab);

  return (
    <Stack spacing={2} sx={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
      <AdminSpeakerSettingsPanel settings={settings} actions={panelActions} />
      <Box sx={{ width: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
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
            minWidth: 0,
            maxWidth: "100%",
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
      </Box>
      <Card variant="outlined">
        <CardContent>
          <SpeakerQuestionsTable
            rows={filteredFresh}
            title="Новые вопросы"
            actionHeader="Скрыть"
            actionAriaLabel="Скрыть вопрос"
            actionIcon={<VisibilityOffOutlinedIcon fontSize="small" />}
            showScreenColumn
            onSetUserVisible={onSetUserVisible}
            onSetOnScreen={onSetOnScreen}
            onUpdateQuestionText={onUpdateQuestionText}
            onAction={onHide}
            onDelete={onDeleteQuestion}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <SpeakerQuestionsTable
            rows={filteredHidden}
            title="Скрытые вопросы"
            actionHeader="Вернуть"
            actionAriaLabel="Вернуть вопрос"
            actionIcon={<UndoOutlinedIcon fontSize="small" />}
            showScreenColumn={false}
            onSetUserVisible={onSetUserVisible}
            onUpdateQuestionText={onUpdateQuestionText}
            onAction={onRestore}
            onDelete={onDeleteQuestion}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
