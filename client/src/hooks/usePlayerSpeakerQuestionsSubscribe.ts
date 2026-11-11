import { useEffect } from "react";
import { socket } from "../socket";

/** Подписка игрока на вопросы спикерам: при входе, reconnect и открытии диалога. */
export function usePlayerSpeakerQuestionsSubscribe(params: {
  slug: string;
  joined: boolean;
  dialogOpen: boolean;
}): void {
  const { slug, joined, dialogOpen } = params;

  useEffect(() => {
    if (!slug || !joined) return;
    const subscribeSpeakerQuestions = () => {
      socket.emit("speaker:questions:subscribe", { slug, viewer: "player" });
    };
    subscribeSpeakerQuestions();
    // После reconnect комнаты/подписка теряются — без повторного subscribe список устаревает.
    socket.on("connect", subscribeSpeakerQuestions);
    return () => {
      socket.off("connect", subscribeSpeakerQuestions);
    };
  }, [slug, joined]);

  useEffect(() => {
    if (!slug || !joined || !dialogOpen) return;
    // При открытии плитки всегда тянем актуальный список (опубликованные вопросы).
    socket.emit("speaker:questions:subscribe", { slug, viewer: "player" });
  }, [slug, joined, dialogOpen]);
}
