import { useCallback } from "react";
import { socket } from "../socket";

type Params = {
  quizId: string;
  speakerQuestionsEnabled: boolean;
  speakerQuestionsAllowLikes: boolean;
  speakerQuestionsShowLikesOnScreen: boolean;
  speakerQuestionsReactionsText: string;
  speakerQuestionsShowAuthorOnScreen: boolean;
  speakerListText: string;
  setMessage: (value: string) => void;
};

export function useSpeakerQuestionsAdminActions({
  quizId,
  speakerQuestionsEnabled,
  speakerQuestionsAllowLikes,
  speakerQuestionsShowLikesOnScreen,
  speakerQuestionsReactionsText,
  speakerQuestionsShowAuthorOnScreen,
  speakerListText,
  setMessage,
}: Params) {
  const saveSpeakerSettings = useCallback(() => {
    if (!quizId) return;
    const speakers = speakerListText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const reactions = speakerQuestionsReactionsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    socket.emit("admin:speaker:settings:set", {
      quizId,
      enabled: speakerQuestionsEnabled,
      speakers,
      allowLikes: speakerQuestionsAllowLikes,
      showLikesOnScreen: speakerQuestionsShowLikesOnScreen,
      reactions,
      showAuthorOnScreen: speakerQuestionsShowAuthorOnScreen,
    });
    setMessage("Настройки секции спикеров сохранены");
  }, [
    quizId,
    setMessage,
    speakerListText,
    speakerQuestionsAllowLikes,
    speakerQuestionsEnabled,
    speakerQuestionsReactionsText,
    speakerQuestionsShowAuthorOnScreen,
    speakerQuestionsShowLikesOnScreen,
  ]);

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
    setSpeakerQuestionStatus,
    setSpeakerQuestionOnScreen,
    hideSpeakerQuestion,
    restoreSpeakerQuestion,
    setSpeakerQuestionUserVisible,
    updateSpeakerQuestionText,
    deleteSpeakerQuestion,
  };
}
