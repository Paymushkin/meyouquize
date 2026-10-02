import type { SpeakerQuestionSession } from "@meyouquize/shared";

export type SpeakerQuestionsSettings = {
  enabled: boolean;
  speakers: string[];
  sessions?: SpeakerQuestionSession[];
  activeSpeakerSessionId?: string | null;
  reactions?: string[];
  showAuthorOnScreen?: boolean;
  /** Подпись «кому: …» на проекторе */
  showRecipientOnScreen?: boolean;
  /** Счётчики реакций на проекторе */
  showReactionsOnScreen?: boolean;
  /** Показывать в форме вариант «Всем спикерам» */
  allowAllSpeakersTarget?: boolean;
  /** true = на /s все вопросы; false = только APPROVED */
  moderatorShowAll?: boolean;
};

export type SpeakerQuestionItem = {
  id: string;
  sessionId?: string | null;
  sessionName?: string | null;
  speakerName: string;
  text: string;
  authorNickname: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userVisible: boolean;
  isOnScreen: boolean;
  isMine?: boolean;
  reactionCounts?: Record<string, number>;
  myReactions?: string[];
  createdAt: string;
};

export type SpeakerQuestionsPayload = {
  settings: SpeakerQuestionsSettings;
  items: SpeakerQuestionItem[];
};
