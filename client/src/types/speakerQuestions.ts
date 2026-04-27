export type SpeakerQuestionsSettings = {
  enabled: boolean;
  speakers: string[];
  allowLikes: boolean;
  showLikesOnScreen?: boolean;
  reactions?: string[];
  showAuthorOnScreen?: boolean;
};

export type SpeakerQuestionItem = {
  id: string;
  speakerName: string;
  text: string;
  authorNickname: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userVisible: boolean;
  isOnScreen: boolean;
  likeCount: number;
  dislikeCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
  reactionCounts?: Record<string, number>;
  myReactions?: string[];
  createdAt: string;
};

export type SpeakerQuestionsPayload = {
  settings: SpeakerQuestionsSettings;
  items: SpeakerQuestionItem[];
};
