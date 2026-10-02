import { useCallback } from "react";
import { socket } from "../socket";
import {
  draftsToSessions,
  type AdminSpeakerQuestionsSettingsValues,
  type AdminSpeakerSessionDraft,
} from "../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";

type Params = {
  quizId: string;
  speakerSettings: AdminSpeakerQuestionsSettingsValues;
  setMessage: (value: string) => void;
};

export function useSpeakerQuestionsAdminActions({ quizId, speakerSettings, setMessage }: Params) {
  const emitSpeakerSettings = useCallback(
    (
      overrides?: Partial<{
        activeSpeakerSessionId: string | null;
        sessions: AdminSpeakerSessionDraft[];
        enabled: boolean;
        reactionsText: string;
        showAuthorOnScreen: boolean;
        showRecipientOnScreen: boolean;
        showReactionsOnScreen: boolean;
        allowAllSpeakersTarget: boolean;
        moderatorShowAll: boolean;
      }>,
      successMessage = "Настройки секции спикеров сохранены",
    ) => {
      if (!quizId) return;
      const sessionDrafts = overrides?.sessions ?? speakerSettings.sessions;
      const sessions = draftsToSessions(sessionDrafts);
      const reactionsText = overrides?.reactionsText ?? speakerSettings.reactionsText;
      const reactions = reactionsText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const requestedActive =
        overrides && "activeSpeakerSessionId" in overrides
          ? overrides.activeSpeakerSessionId
          : speakerSettings.activeSpeakerSessionId;
      const activeId =
        requestedActive && sessions.some((s) => s.id === requestedActive)
          ? requestedActive
          : (sessions[0]?.id ?? null);
      const speakers = sessions.find((s) => s.id === activeId)?.speakers ?? [];
      socket.emit("admin:speaker:settings:set", {
        quizId,
        enabled: overrides?.enabled ?? speakerSettings.enabled,
        sessions,
        activeSpeakerSessionId: activeId,
        speakers,
        reactions,
        showAuthorOnScreen: overrides?.showAuthorOnScreen ?? speakerSettings.showAuthorOnScreen,
        showRecipientOnScreen:
          overrides?.showRecipientOnScreen ?? speakerSettings.showRecipientOnScreen,
        showReactionsOnScreen:
          overrides?.showReactionsOnScreen ?? speakerSettings.showReactionsOnScreen,
        allowAllSpeakersTarget:
          overrides?.allowAllSpeakersTarget ?? speakerSettings.allowAllSpeakersTarget,
        moderatorShowAll: overrides?.moderatorShowAll ?? speakerSettings.moderatorShowAll,
      });
      setMessage(successMessage);
    },
    [quizId, setMessage, speakerSettings],
  );

  const saveSpeakerSettings = useCallback(() => {
    emitSpeakerSettings();
  }, [emitSpeakerSettings]);

  const persistActiveSpeakerSession = useCallback(
    (activeSpeakerSessionId: string | null) => {
      emitSpeakerSettings({ activeSpeakerSessionId }, "Активная сессия обновлена");
    },
    [emitSpeakerSettings],
  );

  const persistSpeakerSessions = useCallback(
    (sessions: AdminSpeakerSessionDraft[], activeSpeakerSessionId?: string | null) => {
      emitSpeakerSettings(
        {
          sessions,
          ...(activeSpeakerSessionId !== undefined ? { activeSpeakerSessionId } : {}),
        },
        "Сессии обновлены",
      );
    },
    [emitSpeakerSettings],
  );

  const persistModeratorShowAll = useCallback(
    (moderatorShowAll: boolean) => {
      emitSpeakerSettings({ moderatorShowAll }, "Настройки модератора сохранены");
    },
    [emitSpeakerSettings],
  );
  const setSpeakerQuestionStatus = useCallback(
    (id: string, status: "PENDING" | "APPROVED" | "REJECTED") => {
      if (!quizId) return;
      socket.emit("admin:speaker:question:status", { quizId, speakerQuestionId: id, status });
    },
    [quizId],
  );

  const setSpeakerQuestionOnScreen = useCallback(
    (id: string, isOnScreen: boolean) => {
      if (!quizId) return;
      socket.emit("admin:speaker:question:screen", { quizId, speakerQuestionId: id, isOnScreen });
    },
    [quizId],
  );

  const hideSpeakerQuestion = useCallback(
    (id: string) => {
      setSpeakerQuestionStatus(id, "REJECTED");
      setSpeakerQuestionOnScreen(id, false);
    },
    [setSpeakerQuestionOnScreen, setSpeakerQuestionStatus],
  );

  const restoreSpeakerQuestion = useCallback(
    (id: string) => {
      setSpeakerQuestionStatus(id, "APPROVED");
    },
    [setSpeakerQuestionStatus],
  );

  const setSpeakerQuestionUserVisible = useCallback(
    (id: string, next: boolean) => {
      if (!quizId) return;
      socket.emit("admin:speaker:question:user-visible", {
        quizId,
        speakerQuestionId: id,
        isVisibleToUsers: next,
      });
    },
    [quizId],
  );

  const updateSpeakerQuestionText = useCallback(
    (id: string, text: string) => {
      if (!quizId) return;
      if (text.trim().length < 3) {
        setMessage("Текст вопроса должен быть не короче 3 символов");
        return;
      }
      socket.emit("admin:speaker:question:update", {
        quizId,
        speakerQuestionId: id,
        text: text.trim(),
      });
    },
    [quizId, setMessage],
  );

  const deleteSpeakerQuestion = useCallback(
    (id: string) => {
      if (!quizId) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Удалить вопрос спикеру без возможности восстановления?");
        if (!confirmed) return;
      }
      socket.emit("admin:speaker:question:delete", {
        quizId,
        speakerQuestionId: id,
      });
    },
    [quizId],
  );

  return {
    saveSpeakerSettings,
    persistActiveSpeakerSession,
    persistSpeakerSessions,
    persistModeratorShowAll,
    setSpeakerQuestionStatus,
    setSpeakerQuestionOnScreen,
    hideSpeakerQuestion,
    restoreSpeakerQuestion,
    setSpeakerQuestionUserVisible,
    updateSpeakerQuestionText,
    deleteSpeakerQuestion,
  };
}
