import {
  DEFAULT_PUBLIC_VIEW_STATE,
  mergePublicViewState,
  projectorPublicViewChanged,
  type PublicViewPayload,
  type PublicViewState,
} from "@meyouquize/shared";
import type {
  ProjectorLeader,
  ProjectorLeaderboardBySubQuiz,
  ProjectorQuestionResult,
} from "../../types/projectorDashboard";
import { projectorDashboardFingerprint } from "./projectorDashboardFingerprint";

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
    case "dashboard": {
      const nextFingerprint = projectorDashboardFingerprint(
        action.perQuestion,
        action.leaderboard,
        action.leaderboardsBySubQuiz,
      );
      const prevFingerprint = projectorDashboardFingerprint(
        state.questions,
        state.leaders,
        state.leaderboardsBySubQuiz,
      );
      if (nextFingerprint === prevFingerprint) {
        return state;
      }
      return {
        ...state,
        questions: action.perQuestion,
        leaders: action.leaderboard,
        leaderboardsBySubQuiz: action.leaderboardsBySubQuiz,
      };
    }
    case "publicView": {
      const view = mergePublicViewState(state.view, action.payload);
      if (!projectorPublicViewChanged(state.view, view)) {
        return state;
      }
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
