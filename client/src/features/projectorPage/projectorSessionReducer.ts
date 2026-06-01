import {
  DEFAULT_PUBLIC_VIEW_STATE,
  mergePublicViewState,
  type PublicViewPayload,
  type PublicViewState,
} from "@meyouquize/shared";
import type {
  ProjectorLeader,
  ProjectorLeaderboardBySubQuiz,
  ProjectorQuestionResult,
} from "../../types/projectorDashboard";

export type ProjectorSessionState = {
  questions: ProjectorQuestionResult[];
  leaders: ProjectorLeader[];
  leaderboardsBySubQuiz: ProjectorLeaderboardBySubQuiz[];
  quizTitle: string;
  view: PublicViewState;
  /** Инкремент при изменении лидерборда — анимация таблицы без лишних срабатываний на обновление вопросов. */
  resultsAnimationTick: number;
};

export type ProjectorSessionAction =
  | {
      type: "dashboard";
      perQuestion: ProjectorQuestionResult[];
      leaderboard: ProjectorLeader[];
      leaderboardsBySubQuiz: ProjectorLeaderboardBySubQuiz[];
    }
  | { type: "publicView"; payload: PublicViewPayload }
  | { type: "bumpLeaderboardAnim" };

export const initialProjectorSessionState: ProjectorSessionState = {
  questions: [],
  leaders: [],
  leaderboardsBySubQuiz: [],
  quizTitle: "",
  view: DEFAULT_PUBLIC_VIEW_STATE,
  resultsAnimationTick: 0,
};

export function projectorSessionReducer(
  state: ProjectorSessionState,
  action: ProjectorSessionAction,
): ProjectorSessionState {
  switch (action.type) {
    case "dashboard":
      return {
        ...state,
        questions: action.perQuestion,
        leaders: action.leaderboard,
        leaderboardsBySubQuiz: action.leaderboardsBySubQuiz,
      };
    case "publicView": {
      const view = mergePublicViewState(state.view, action.payload);
      const quizTitle =
        typeof action.payload.title === "string" ? action.payload.title.trim() : state.quizTitle;
      return { ...state, view, quizTitle };
    }
    case "bumpLeaderboardAnim":
      return { ...state, resultsAnimationTick: state.resultsAnimationTick + 1 };
    default:
      return state;
  }
}
