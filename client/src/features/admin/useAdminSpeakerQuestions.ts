import { useCallback, useMemo, useState } from "react";
import type { PublicViewPayload } from "@meyouquize/shared";
import {
  applySpeakerQuestionsAdminFieldsFromPublicView,
  applySpeakerQuestionsScreenVisibilityFromView,
  type AdminSpeakerQuestionsSettingsValues,
} from "../speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import { getStringArrayOrNull } from "../../utils/unknownGuards";
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
  const [speakersText, setSpeakersText] = useState("");
  const [reportSpeakerQuestionIds, setReportSpeakerQuestionIds] = useState<string[]>([]);

  const applyAdminFieldsFromPublicView = useCallback((view: PublicViewPayload) => {
    applySpeakerQuestionsAdminFieldsFromPublicView(view, {
      setEnabled,
      setReactionsText,
      setShowAuthorOnScreen,
      setShowRecipientOnScreen,
      setShowReactionsOnScreen,
      setAllowAllSpeakersTarget,
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
  }, []);

  const applyReportSpeakerQuestionIds = useCallback((ids: unknown) => {
    if (!Array.isArray(ids)) return;
    setReportSpeakerQuestionIds(ids.filter((item): item is string => typeof item === "string"));
  }, []);

  const applyRoomPublicViewSlice = useCallback(
    (pv: PublicViewPayload) => {
      applyAdminFieldsFromPublicView(pv);
      applyReportSpeakerQuestionIds(pv.reportSpeakerQuestionIds);
      const speakerList = getStringArrayOrNull(pv.speakerQuestionsSpeakers);
      if (speakerList) {
        setSpeakersText(speakerList.join("\n"));
      }
    },
    [applyAdminFieldsFromPublicView, applyReportSpeakerQuestionIds],
  );

  const settings = useMemo(
    (): AdminSpeakerQuestionsSettingsValues => ({
      enabled,
      reactionsText,
      showAuthorOnScreen,
      showRecipientOnScreen,
      showReactionsOnScreen,
      allowAllSpeakersTarget,
      speakersText,
    }),
    [
      enabled,
      reactionsText,
      showAuthorOnScreen,
      showRecipientOnScreen,
      showReactionsOnScreen,
      allowAllSpeakersTarget,
      speakersText,
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
    setSpeakersText,
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
      setSpeakersText,
    },
  };
}
