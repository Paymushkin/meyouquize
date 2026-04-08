import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { LeaderboardItem, QuestionResult, SubQuizLeaderboardPayload } from "../admin/adminEventTypes";
import { normalizePublicViewState, toBrandingState, type PublicViewPayload, type PublicViewMode } from "../publicViewContract";
import { socket } from "../socket";

type ActiveState = { activeQuestion: { id: string } | null };
type QuestionFormPatchable = {
  id?: string;
  isActive?: boolean;
  showVoteCount?: boolean;
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
  setHighlightedLeadersCount: (value: number) => void;
  setQuestionForms: Dispatch<SetStateAction<QuestionFormPatchable[]>>;
  setProjectorBackground: (value: string) => void;
  setCloudQuestionColor: (value: string) => void;
  setCloudTagColors: (value: string[]) => void;
  setCloudTopTagColor: (value: string) => void;
  setCloudDensity: (value: number) => void;
  setCloudTagPadding: (value: number) => void;
  setCloudSpiral: (value: "archimedean" | "rectangular") => void;
  setCloudAnimationStrength: (value: number) => void;
  setVoteQuestionTextColor: (value: string) => void;
  setVoteOptionTextColor: (value: string) => void;
  setVoteProgressTrackColor: (value: string) => void;
  setVoteProgressBarColor: (value: string) => void;
  setShowFirstCorrectAnswerer: (value: boolean) => void;
  setFirstCorrectWinnersCount: (value: number) => void;
};

export function useAdminEventSocket<TQuestion extends QuestionFormPatchable>(
  params: Omit<Params, "setQuestionForms"> & { setQuestionForms: Dispatch<SetStateAction<TQuestion[]>> },
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
    setHighlightedLeadersCount,
    setQuestionForms,
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
  } = params;

  const clearSocketListeners = useCallback(() => {
    socket.off("connect");
    socket.off("state:quiz");
    socket.off("error:message");
    socket.off("results:dashboard");
    socket.off("results:public:view");
  }, []);

  const setupSocketListeners = useCallback(() => {
    if (socket.connected) socket.disconnect();
    clearSocketListeners();
    socket.connect();
    socket.on("connect", () => {
      socket.emit("results:subscribe", { slug: eventName });
    });
    socket.on("state:quiz", (state: ActiveState) => {
      if (state.activeQuestion?.id) setQuestionId(state.activeQuestion.id);
      setQuestionForms((prev) =>
        prev.map((q) => ({
          ...q,
          isActive: !!state.activeQuestion?.id && q.id === state.activeQuestion.id,
        })),
      );
    });
    socket.on("error:message", (evt: { message: string }) => setMessage(evt.message));
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
      setShowFirstCorrectAnswerer(view.showFirstCorrectAnswerer);
      setFirstCorrectWinnersCount(view.firstCorrectWinnersCount);
      if (typeof payload.highlightedLeadersCount === "number") {
        setHighlightedLeadersCount(payload.highlightedLeadersCount);
      }
      if (payload.questionId) {
        setQuestionForms((prev) =>
          prev.map((q) => (q.id === payload.questionId
            ? {
              ...q,
              showVoteCount: payload.showVoteCount ?? q.showVoteCount ?? true,
              showQuestionTitle: payload.showQuestionTitle ?? q.showQuestionTitle ?? true,
              hiddenTagTexts: Array.isArray(payload.hiddenTagTexts) ? payload.hiddenTagTexts : (q.hiddenTagTexts ?? []),
              injectedTagWords: Array.isArray(payload.injectedTagWords) ? payload.injectedTagWords : (q.injectedTagWords ?? []),
              tagCountOverrides: Array.isArray(payload.tagCountOverrides) ? payload.tagCountOverrides : (q.tagCountOverrides ?? []),
            }
            : q)),
        );
      }
      const nextBranding = toBrandingState(payload);
      setProjectorBackground(nextBranding.projectorBackground);
      setCloudQuestionColor(nextBranding.cloudQuestionColor);
      setCloudTagColors(nextBranding.cloudTagColors);
      setCloudTopTagColor(nextBranding.cloudTopTagColor);
      setCloudDensity(nextBranding.cloudDensity);
      setCloudTagPadding(nextBranding.cloudTagPadding);
      setCloudSpiral(nextBranding.cloudSpiral);
      setCloudAnimationStrength(nextBranding.cloudAnimationStrength);
      setVoteQuestionTextColor(nextBranding.voteQuestionTextColor);
      setVoteOptionTextColor(nextBranding.voteOptionTextColor);
      setVoteProgressTrackColor(nextBranding.voteProgressTrackColor);
      setVoteProgressBarColor(nextBranding.voteProgressBarColor);
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
    setHighlightedLeadersCount,
    setLeaderboard,
    setLeaderboardsBySubQuiz,
    setMessage,
    setProjectorBackground,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionForms,
    setQuestionId,
    setQuestionResults,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
  ]);

  return { setupSocketListeners, clearSocketListeners };
}
