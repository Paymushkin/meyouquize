import { useCallback, useEffect, useMemo, useState } from "react";
import { socket } from "../socket";
import type { ActiveFeedbackForm } from "../types/feedback";
import { parseSocketErrorMessage } from "../utils/socketError";

type Params = {
  quizId: string | undefined;
  activeFeedbackForm: ActiveFeedbackForm | null | undefined;
  feedbackSubmittedFromState?: boolean;
  joined: boolean;
};

export function useQuizPlayFeedback({
  quizId,
  activeFeedbackForm,
  feedbackSubmittedFromState,
  joined,
}: Params) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackStatusKnown, setFeedbackStatusKnown] = useState(false);
  const [dismissedFeedbackActivationKey, setDismissedFeedbackActivationKey] = useState<
    string | null
  >(null);
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedFlash, setSubmittedFlash] = useState(false);

  useEffect(() => {
    const onStatus = (payload: { submitted?: boolean }) => {
      setFeedbackSubmitted(Boolean(payload?.submitted));
      setFeedbackStatusKnown(true);
    };
    const onSubmitted = () => {
      setFeedbackSubmitted(true);
      setSubmittedFlash(true);
      setSubmitting(false);
    };
    const onError = (payload: unknown) => {
      const message = parseSocketErrorMessage(payload);
      if (message.includes("уже отправили")) {
        setFeedbackSubmitted(true);
        setSubmitting(false);
      }
    };
    socket.on("player:feedback-status", onStatus);
    socket.on("feedback:submitted", onSubmitted);
    socket.on("error:message", onError);
    return () => {
      socket.off("player:feedback-status", onStatus);
      socket.off("feedback:submitted", onSubmitted);
      socket.off("error:message", onError);
    };
  }, []);

  useEffect(() => {
    if (!activeFeedbackForm) {
      setFeedbackSubmitted(false);
      setFeedbackStatusKnown(false);
      setScaleAnswers({});
      setComment("");
      return;
    }
    setScaleAnswers({});
    setComment("");
    if (typeof feedbackSubmittedFromState === "boolean") {
      setFeedbackSubmitted(feedbackSubmittedFromState);
      setFeedbackStatusKnown(true);
    }
  }, [activeFeedbackForm?.id, activeFeedbackForm, feedbackSubmittedFromState]);

  const activationKey =
    activeFeedbackForm?.id && activeFeedbackForm.activatedAt
      ? `${activeFeedbackForm.id}:${activeFeedbackForm.activatedAt}`
      : (activeFeedbackForm?.id ?? null);

  useEffect(() => {
    if (!submittedFlash) return;
    const timer = window.setTimeout(() => setSubmittedFlash(false), 2200);
    return () => window.clearTimeout(timer);
  }, [submittedFlash]);

  const shouldShowFeedbackPopup = useMemo(() => {
    if (!joined || !activeFeedbackForm || activeFeedbackForm.isClosed) return false;
    if (feedbackSubmitted) return submittedFlash;
    if (activationKey && dismissedFeedbackActivationKey === activationKey) return false;
    return feedbackStatusKnown;
  }, [
    joined,
    activeFeedbackForm,
    feedbackSubmitted,
    activationKey,
    dismissedFeedbackActivationKey,
    feedbackStatusKnown,
    submittedFlash,
  ]);

  const canSubmitFeedback = useMemo(() => {
    if (!activeFeedbackForm || feedbackSubmitted) return false;
    return activeFeedbackForm.scales.every((scale) => {
      const answer = scaleAnswers[scale.id];
      return typeof answer === "number" && answer >= 0 && answer < scale.options.length;
    });
  }, [activeFeedbackForm, feedbackSubmitted, scaleAnswers]);

  const selectScaleOption = useCallback((scaleId: string, optionIndex: number) => {
    setScaleAnswers((prev) => ({ ...prev, [scaleId]: optionIndex }));
  }, []);

  const closeFeedbackPopup = useCallback(() => {
    if (!activationKey) return;
    setDismissedFeedbackActivationKey(activationKey);
  }, [activationKey]);

  const submitFeedback = useCallback(() => {
    if (!quizId || !activeFeedbackForm || !canSubmitFeedback || submitting || feedbackSubmitted) {
      return;
    }
    setSubmitting(true);
    socket.emit("feedback:submit", {
      quizId,
      scaleAnswers,
      comment: comment.trim() || undefined,
    });
  }, [
    quizId,
    activeFeedbackForm,
    canSubmitFeedback,
    submitting,
    feedbackSubmitted,
    scaleAnswers,
    comment,
  ]);

  return {
    shouldShowFeedbackPopup,
    feedbackSubmitted,
    scaleAnswers,
    comment,
    setComment,
    selectScaleOption,
    closeFeedbackPopup,
    canSubmitFeedback,
    submitFeedback,
    submitting,
    submittedFlash,
  };
}
