export type SpeakerQuestionsSettings = {
  enabled: boolean;
  speakers: string[];
  reactions?: string[];
  showAuthorOnScreen?: boolean;
  /** Подпись «кому: …» на проекторе */
  showRecipientOnScreen?: boolean;
  /** Счётчики реакций на проекторе */
  showReactionsOnScreen?: boolean;
};

export type SpeakerQuestionItem = {
  id: string;
  speakerName: string;
  text: string;
  authorNickname: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userVisible: boolean;
  isOnScreen: boolean;
  reactionCounts?: Record<string, number>;
  myReactions?: string[];
  createdAt: string;
};

export type SpeakerQuestionsPayload = {
  settings: SpeakerQuestionsSettings;
  items: SpeakerQuestionItem[];
};
