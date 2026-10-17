import { useCallback, useMemo, useState } from "react";
import { normalizeSpeakerQuestionSessions, type PublicViewPayload } from "@meyouquize/shared";
import {
  applySpeakerQuestionsAdminFieldsFromPublicView,
  applySpeakerQuestionsScreenVisibilityFromView,
  sessionsToDrafts,
  type AdminSpeakerQuestionsSettingsValues,
  type AdminSpeakerSessionDraft,
} from "../speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import type { SpeakerQuestionsPayload } from "../../types/speakerQuestions";

type EmitPatch = (patch: { reportSpeakerQuestionIds: string[] }) => void;

export function useAdminSpeakerQuestions(emitPublicViewPatch: EmitPatch) {
  const [payload, setPayload] = useState<SpeakerQuestionsPayload | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [reactionsText, setReactionsText] = useState("👍\n🔥\n👏\n❤️");
  const [showAuthorOnScreen, setShowAuthorOnScreen] = useState(false);
  const [showRecipientOnScreen, setShowRecipientOnScreen] = useState(true);
  const [showReactionsOnScreen, setShowReactionsOnScreen] = useState(true);
  const [allowAllSpeakersTarget, setAllowAllSpeakersTarget] = useState(true);
  const [moderatorShowAll, setModeratorShowAll] = useState(false);
  const [sessions, setSessions] = useState<AdminSpeakerSessionDraft[]>([]);
  const [activeSpeakerSessionId, setActiveSpeakerSessionId] = useState<string | null>(null);
  const [reportSpeakerQuestionIds, setReportSpeakerQuestionIds] = useState<string[]>([]);

  const applyAdminFieldsFromPublicView = useCallback((view: PublicViewPayload) => {
    applySpeakerQuestionsAdminFieldsFromPublicView(view, {
      setEnabled,
      setReactionsText,
      setShowAuthorOnScreen,
      setShowRecipientOnScreen,
      setShowReactionsOnScreen,
      setAllowAllSpeakersTarget,
      setModeratorShowAll,
    });
  }, []);

  const applyScreenVisibilityFromPublicView = useCallback((view: PublicViewPayload) => {
    applySpeakerQuestionsScreenVisibilityFromView(view, {
      setShowAuthorOnScreen,
      setShowRecipientOnScreen,
      setShowReactionsOnScreen,
    });
    if (typeof view.speakerQuestionsAllowAllSpeakersTarget === "boolean") {
      setAllowAllSpeakersTarget(view.speakerQuestionsAllowAllSpeakersTarget);
    }
    if (typeof view.speakerQuestionsModeratorShowAll === "boolean") {
      setModeratorShowAll(view.speakerQuestionsModeratorShowAll);
    }
  }, []);

  const applyReportSpeakerQuestionIds = useCallback((ids: unknown) => {
    if (!Array.isArray(ids)) return;
    setReportSpeakerQuestionIds(ids.filter((item): item is string => typeof item === "string"));
  }, []);

  const applySessionsFromPublicView = useCallback((pv: PublicViewPayload) => {
    const normalized = normalizeSpeakerQuestionSessions({
      sessions: pv.speakerQuestionSessions,
      activeSpeakerSessionId: pv.activeSpeakerSessionId,
      speakers: pv.speakerQuestionsSpeakers,
    });
    setSessions(sessionsToDrafts(normalized.sessions));
    setActiveSpeakerSessionId(normalized.activeSpeakerSessionId);
  }, []);

  const applyRoomPublicViewSlice = useCallback(
    (pv: PublicViewPayload) => {
      applyAdminFieldsFromPublicView(pv);
      applyReportSpeakerQuestionIds(pv.reportSpeakerQuestionIds);
      applySessionsFromPublicView(pv);
    },
    [applyAdminFieldsFromPublicView, applyReportSpeakerQuestionIds, applySessionsFromPublicView],
  );

  const settings = useMemo(
    (): AdminSpeakerQuestionsSettingsValues => ({
      enabled,
      reactionsText,
      showAuthorOnScreen,
      showRecipientOnScreen,
      showReactionsOnScreen,
      allowAllSpeakersTarget,
      moderatorShowAll,
      sessions,
      activeSpeakerSessionId,
    }),
    [
      enabled,
      reactionsText,
      showAuthorOnScreen,
      showRecipientOnScreen,
      showReactionsOnScreen,
      allowAllSpeakersTarget,
      moderatorShowAll,
      sessions,
      activeSpeakerSessionId,
    ],
  );

  const toggleReportSpeakerQuestion = useCallback(
    (questionId: string, nextEnabled: boolean) => {
      const all = (payload?.items ?? []).map((q) => q.id);
      const current =
        reportSpeakerQuestionIds.length === 0
          ? [...all]
          : reportSpeakerQuestionIds.filter((id) => all.includes(id));
      const next = nextEnabled
        ? Array.from(new Set([...current, questionId]))
        : current.filter((id) => id !== questionId);
      setReportSpeakerQuestionIds(next);
      emitPublicViewPatch({ reportSpeakerQuestionIds: next });
    },
    [emitPublicViewPatch, payload?.items, reportSpeakerQuestionIds],
  );

  return {
    payload,
    setPayload,
    enabled,
    setEnabled,
    settings,
    reportSpeakerQuestionIds,
    applyAdminFieldsFromPublicView,
    applyScreenVisibilityFromPublicView,
    applyReportSpeakerQuestionIds,
    applyRoomPublicViewSlice,
    toggleReportSpeakerQuestion,
    panelSetters: {
      setEnabled,
      setReactionsText,
      setShowAuthorOnScreen,
      setShowRecipientOnScreen,
      setShowReactionsOnScreen,
      setAllowAllSpeakersTarget,
      setModeratorShowAll,
      setSessions,
      setActiveSpeakerSessionId,
    },
  };
}
