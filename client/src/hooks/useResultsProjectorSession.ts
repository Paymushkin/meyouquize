import { useEffect, useMemo, useReducer, useState } from "react";
import { normalizePublicViewState, type PublicViewPayload } from "@meyouquize/shared";
import {
  buildProjectorWinnersHeroDebugInfo,
  computeProjectorDerived,
  type ProjectorDerived,
} from "../features/projectorPage/projectorDerived";
import {
  initialProjectorSessionState,
  projectorSessionReducer,
  type ProjectorSessionState,
} from "../features/projectorPage/projectorSessionReducer";
import { socket } from "../socket";
import type { ProjectorLeader, ProjectorQuestionResult } from "../types/projectorDashboard";
import { useProjectorBodyBackground } from "./useProjectorBodyBackground";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import type { ReactionSession } from "../pages/quiz-play/types";
import { parseSocketErrorMessage } from "../utils/socketError";

export type UseResultsProjectorSessionResult = ProjectorDerived & {
  quizTitle: string;
  view: ProjectorSessionState["view"];
  resultsAnimationTick: number;
  speakerQuestions: SpeakerQuestionsPayload | null;
  reactionSession: ReactionSession | null;
};

export function useResultsProjectorSession(
  slug: string | undefined,
): UseResultsProjectorSessionResult {
  const [state, dispatch] = useReducer(projectorSessionReducer, initialProjectorSessionState);
  const [speakerQuestions, setSpeakerQuestions] = useState<SpeakerQuestionsPayload | null>(null);
  const [reactionSession, setReactionSession] = useState<ReactionSession | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (!socket.connected) socket.connect();
    const onDashboard = (payload: {
      perQuestion: ProjectorQuestionResult[];
      leaderboard: ProjectorLeader[];
    }) => {
      dispatch({
        type: "dashboard",
        perQuestion: payload.perQuestion,
        leaderboard: payload.leaderboard,
      });
    };
    const onPublicView = (payload: PublicViewPayload) => {
      dispatch({ type: "publicView", payload });
      if (import.meta.env.DEV) {
        const v = normalizePublicViewState(payload);
        console.info("[mq-winners] results:public:view", {
          mode: v.mode,
          questionId: v.questionId,
          showFirstCorrectAnswerer: v.showFirstCorrectAnswerer,
          firstCorrectWinnersCount: v.firstCorrectWinnersCount,
        });
      }
    };
    const onError = (evt: unknown) => {
      console.error("[results-page] error:message", parseSocketErrorMessage(evt));
    };
    const onSpeakerQuestions = (payload: SpeakerQuestionsPayload) => {
      setSpeakerQuestions(payload);
    };
    const onState = (payload: { reactionSession?: ReactionSession | null }) => {
      setReactionSession(payload.reactionSession ?? null);
    };
    socket.on("results:dashboard", onDashboard);
    socket.on("results:public:view", onPublicView);
    socket.on("error:message", onError);
    socket.on("speaker:questions:update", onSpeakerQuestions);
    socket.on("state:quiz", onState);
    socket.emit("results:subscribe", { slug });
    socket.emit("speaker:questions:subscribe", { slug, viewer: "projector" });
    return () => {
      socket.off("results:dashboard", onDashboard);
      socket.off("results:public:view", onPublicView);
      socket.off("error:message", onError);
      socket.off("speaker:questions:update", onSpeakerQuestions);
      socket.off("state:quiz", onState);
    };
  }, [slug]);

  useEffect(() => {
    dispatch({ type: "bumpLeaderboardAnim" });
  }, [state.leaders]);

  const derived = useMemo(() => computeProjectorDerived(state), [state]);

  useProjectorBodyBackground(
    state.view.projectorBackground,
    Boolean(state.view.brandProjectorBackgroundImageUrl?.trim()),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const reasons = buildProjectorWinnersHeroDebugInfo(state.view, derived);
    console.info(
      `[mq-winners] hero ${derived.showProjectorWinnersHero ? "SHOW" : "HIDE"}`,
      reasons,
    );
    if (derived.showProjectorWinnersHero) {
      console.info("[mq-winners] names on screen:", derived.firstCorrectWinnersShown);
    }
  }, [state.view, derived]);

  return useMemo(
    () => ({
      ...derived,
      quizTitle: state.quizTitle,
      view: state.view,
      resultsAnimationTick: state.resultsAnimationTick,
      speakerQuestions,
      reactionSession,
    }),
    [
      derived,
      state.quizTitle,
      state.view,
      state.resultsAnimationTick,
      speakerQuestions,
      reactionSession,
    ],
  );
}
