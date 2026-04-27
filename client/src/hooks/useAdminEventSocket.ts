import { useCallback, type Dispatch, type SetStateAction } from "react";
import type {
  LeaderboardItem,
  QuestionResult,
  SubQuizLeaderboardPayload,
} from "../admin/adminEventTypes";
import {
  normalizePublicViewState,
  toBrandingState,
  type PublicViewPayload,
  type PublicViewMode,
} from "../publicViewContract";
import { socket } from "../socket";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import type { ReactionSession } from "../pages/quiz-play/types";
import { parseSocketErrorMessage } from "../utils/socketError";
import { patchQuestionsFromPublicView } from "../features/publicView/patchQuestionFromPublicView";

type ActiveState = {
  activeQuestion: { id: string } | null;
  activeQuestions?: Array<{ id: string }>;
  reactionSession?: ReactionSession | null;
};
type QuestionFormPatchable = {
  id?: string;
  isActive?: boolean;
  showVoteCount?: boolean;
  showCorrectOption?: boolean;
  showQuestionTitle?: boolean;
  hiddenTagTexts?: string[];
  injectedTagWords?: Array<{ text: string; count: number }>;
  tagCountOverrides?: Array<{ text: string; count: number }>;
};

type Params = {
  eventName: string;
  setQuestionId: (value: string) => void;
  setMessage: (value: string) => void;
  setQuestionResults: (rows: QuestionResult[]) => void;
  setLeaderboard: (rows: LeaderboardItem[]) => void;
  setLeaderboardsBySubQuiz: (rows: SubQuizLeaderboardPayload[]) => void;
  setPublicViewMode: (mode: PublicViewMode) => void;
  setPublicViewQuestionId: (id: string | undefined) => void;
  setQuestionRevealStage: (value: "options" | "results") => void;
  setHighlightedLeadersCount: (value: number) => void;
  setQuestionForms: Dispatch<SetStateAction<QuestionFormPatchable[]>>;
  setProjectorBackground: (value: string) => void;
  setCloudQuestionColor: (value: string) => void;
  setCloudTagColors: (value: string[]) => void;
  setCloudTopTagColor: (value: string) => void;
  setCloudCorrectTagColor: (value: string) => void;
  setCloudDensity: (value: number) => void;
  setCloudTagPadding: (value: number) => void;
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  setCloudAnimationStrength: (value: number) => void;
  setVoteQuestionTextColor: (value: string) => void;
  setVoteOptionTextColor: (value: string) => void;
  setVoteProgressTrackColor: (value: string) => void;
  setVoteProgressBarColor: (value: string) => void;
  setBrandPrimaryColor: (value: string) => void;
  setBrandAccentColor: (value: string) => void;
  setBrandSurfaceColor: (value: string) => void;
  setBrandTextColor: (value: string) => void;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandLogoUrl: (value: string) => void;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  setBrandBodyBackgroundColor: (value: string) => void;
  setBrandBackgroundOverlayColor: (value: string) => void;
  setShowFirstCorrectAnswerer: (value: boolean) => void;
  setFirstCorrectWinnersCount: (value: number) => void;
  setSpeakerQuestionsPayload: (value: SpeakerQuestionsPayload | null) => void;
  setReactionSession?: (value: ReactionSession | null) => void;
  setReactionsOverlayText?: (value: string) => void;
  setReactionWidgets?: (value: Array<{ id: string; title: string; reactions: string[] }>) => void;
  setOnlineUsersCount?: (value: number) => void;
};

export function useAdminEventSocket<TQuestion extends QuestionFormPatchable>(
  params: Omit<Params, "setQuestionForms"> & {
    setQuestionForms: Dispatch<SetStateAction<TQuestion[]>>;
  },
) {
  const {
    eventName,
    setQuestionId,
    setMessage,
    setQuestionResults,
    setLeaderboard,
    setLeaderboardsBySubQuiz,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionRevealStage,
    setHighlightedLeadersCount,
    setQuestionForms,
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudCorrectTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setBrandBackgroundOverlayColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
    setSpeakerQuestionsPayload,
    setReactionSession,
    setReactionsOverlayText,
    setReactionWidgets,
    setOnlineUsersCount,
  } = params;

  const clearSocketListeners = useCallback(() => {
    socket.off("connect");
    socket.off("state:quiz");
    socket.off("error:message");
    socket.off("results:dashboard");
    socket.off("results:public:view");
    socket.off("speaker:questions:update");
    socket.off("quiz:online:count");
  }, []);

  const setupSocketListeners = useCallback(() => {
    if (socket.connected) socket.disconnect();
    clearSocketListeners();
    socket.connect();
    socket.on("connect", () => {
      socket.emit("results:subscribe", { slug: eventName });
      socket.emit("speaker:questions:subscribe", { slug: eventName, viewer: "admin" });
    });
    socket.on("state:quiz", (state: ActiveState) => {
      if (state.activeQuestion?.id) setQuestionId(state.activeQuestion.id);
      if (setReactionSession) {
        setReactionSession(state.reactionSession ?? null);
      }
      const activeIds = new Set<string>(
        Array.isArray(state.activeQuestions)
          ? state.activeQuestions.map((q) => q.id)
          : state.activeQuestion?.id
            ? [state.activeQuestion.id]
            : [],
      );
      setQuestionForms((prev) =>
        prev.map((q) => ({
          ...q,
          isActive: !!q.id && activeIds.has(q.id),
        })),
      );
    });
    socket.on("error:message", (evt: unknown) => setMessage(parseSocketErrorMessage(evt)));
    socket.on(
      "results:dashboard",
      (payload: {
        perQuestion: QuestionResult[];
        leaderboard: LeaderboardItem[];
        leaderboardsBySubQuiz: SubQuizLeaderboardPayload[];
      }) => {
        setQuestionResults(payload.perQuestion);
        setLeaderboard(payload.leaderboard);
        setLeaderboardsBySubQuiz(payload.leaderboardsBySubQuiz);
      },
    );
    socket.on("results:public:view", (payload: PublicViewPayload) => {
      const view = normalizePublicViewState(payload);
      setPublicViewMode(view.mode);
      setPublicViewQuestionId(view.questionId);
      setQuestionRevealStage(view.questionRevealStage);
      setShowFirstCorrectAnswerer(view.showFirstCorrectAnswerer);
      setFirstCorrectWinnersCount(view.firstCorrectWinnersCount);
      if (typeof payload.highlightedLeadersCount === "number") {
        setHighlightedLeadersCount(payload.highlightedLeadersCount);
      }
      setQuestionForms((prev) => patchQuestionsFromPublicView(prev, payload));
      const nextBranding = toBrandingState(payload);
      setProjectorBackground(nextBranding.projectorBackground);
      setCloudQuestionColor(nextBranding.cloudQuestionColor);
      setCloudTagColors(nextBranding.cloudTagColors);
      setCloudTopTagColor(nextBranding.cloudTopTagColor);
      setCloudCorrectTagColor(nextBranding.cloudCorrectTagColor);
      setCloudDensity(nextBranding.cloudDensity);
      setCloudTagPadding(nextBranding.cloudTagPadding);
      setCloudSpiral(nextBranding.cloudSpiral);
      setCloudAnimationStrength(nextBranding.cloudAnimationStrength);
      setVoteQuestionTextColor(nextBranding.voteQuestionTextColor);
      setVoteOptionTextColor(nextBranding.voteOptionTextColor);
      setVoteProgressTrackColor(nextBranding.voteProgressTrackColor);
      setVoteProgressBarColor(nextBranding.voteProgressBarColor);
      setBrandPrimaryColor(nextBranding.brandPrimaryColor);
      setBrandAccentColor(nextBranding.brandAccentColor);
      setBrandSurfaceColor(nextBranding.brandSurfaceColor);
      setBrandTextColor(nextBranding.brandTextColor);
      setBrandFontFamily(nextBranding.brandFontFamily);
      setBrandFontUrl(nextBranding.brandFontUrl);
      setBrandLogoUrl(nextBranding.brandLogoUrl);
      setBrandPlayerBackgroundImageUrl(nextBranding.brandPlayerBackgroundImageUrl);
      setBrandProjectorBackgroundImageUrl(nextBranding.brandProjectorBackgroundImageUrl);
      setBrandBodyBackgroundColor(nextBranding.brandBodyBackgroundColor);
      setBrandBackgroundOverlayColor(nextBranding.brandBackgroundOverlayColor);
      if (typeof view.reactionsOverlayText === "string" && setReactionsOverlayText) {
        setReactionsOverlayText(view.reactionsOverlayText);
      }
      if (Array.isArray(payload.reactionsWidgets) && setReactionWidgets) {
        setReactionWidgets(
          payload.reactionsWidgets
            .filter((item) => item && typeof item.id === "string" && Array.isArray(item.reactions))
            .map((item) => ({
              id: item.id,
              title: typeof item.title === "string" ? item.title : "",
              reactions: item.reactions.filter(
                (reaction): reaction is string => typeof reaction === "string",
              ),
            })),
        );
      }
    });
    socket.on("speaker:questions:update", (payload: SpeakerQuestionsPayload) => {
      setSpeakerQuestionsPayload(payload);
    });
    socket.on("quiz:online:count", (payload: { count?: number }) => {
      if (!setOnlineUsersCount) return;
      const count = typeof payload?.count === "number" ? payload.count : 0;
      setOnlineUsersCount(Math.max(0, Math.trunc(count)));
    });
  }, [
    clearSocketListeners,
    eventName,
    setCloudAnimationStrength,
    setCloudDensity,
    setCloudQuestionColor,
    setCloudSpiral,
    setCloudTagColors,
    setCloudTagPadding,
    setCloudTopTagColor,
    setCloudCorrectTagColor,
    setHighlightedLeadersCount,
    setLeaderboard,
    setLeaderboardsBySubQuiz,
    setMessage,
    setProjectorBackground,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionRevealStage,
    setQuestionForms,
    setQuestionId,
    setQuestionResults,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setBrandBackgroundOverlayColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
    setSpeakerQuestionsPayload,
    setReactionSession,
    setReactionsOverlayText,
    setReactionWidgets,
    setOnlineUsersCount,
  ]);

  return { setupSocketListeners, clearSocketListeners };
}
