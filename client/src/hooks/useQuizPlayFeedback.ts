import { useCallback, useEffect, useMemo, useState } from "react";
import { socket } from "../socket";
import {
  isFeedbackScaleMulti,
  resolveFeedbackMultiMaxAnswers,
  type ActiveFeedbackForm,
  type FeedbackScaleAnswers,
} from "../types/feedback";
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
  const [scaleAnswers, setScaleAnswers] = useState<FeedbackScaleAnswers>({});
  const [openFieldAnswers, setOpenFieldAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const activeFormId = activeFeedbackForm?.id ?? null;

  useEffect(() => {
    const onStatus = (payload: { submitted?: boolean }) => {
      setFeedbackSubmitted(Boolean(payload?.submitted));
      setFeedbackStatusKnown(true);
    };
    const onSubmitted = () => {
      setFeedbackSubmitted(true);
      setSubmitting(false);
      setSubmitError("");
    };
    const onError = (payload: unknown) => {
      setSubmitting(false);
      const message = parseSocketErrorMessage(payload);
      if (message.includes("уже отправили")) {
        setFeedbackSubmitted(true);
        setSubmitError("");
        return;
      }
      if (message) setSubmitError(message);
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
    if (!activeFormId) {
      setFeedbackSubmitted(false);
      setFeedbackStatusKnown(false);
      setScaleAnswers({});
      setOpenFieldAnswers({});
      setSubmitError("");
      return;
    }
    setScaleAnswers({});
    setOpenFieldAnswers({});
    setSubmitError("");
  }, [activeFormId]);

  useEffect(() => {
    if (!activeFormId) return;
    if (typeof feedbackSubmittedFromState === "boolean") {
      setFeedbackSubmitted(feedbackSubmittedFromState);
      setFeedbackStatusKnown(true);
    }
  }, [activeFormId, feedbackSubmittedFromState]);

  const activationKey =
    activeFeedbackForm?.id && activeFeedbackForm.activatedAt
      ? `${activeFeedbackForm.id}:${activeFeedbackForm.activatedAt}`
      : (activeFeedbackForm?.id ?? null);

  const shouldShowFeedbackPopup = useMemo(() => {
    if (!joined || !activeFeedbackForm || activeFeedbackForm.isClosed) return false;
    if (feedbackSubmitted) return false;
    if (activationKey && dismissedFeedbackActivationKey === activationKey) return false;
    return feedbackStatusKnown;
  }, [
    joined,
    activeFeedbackForm,
    feedbackSubmitted,
    activationKey,
    dismissedFeedbackActivationKey,
    feedbackStatusKnown,
  ]);

  const shouldDeferQuestionPopup = useMemo(() => {
    if (!joined || !activeFeedbackForm || activeFeedbackForm.isClosed) return false;
    if (feedbackSubmitted) return false;
    if (activationKey && dismissedFeedbackActivationKey === activationKey) return false;
    return true;
  }, [
    joined,
    activeFeedbackForm,
    feedbackSubmitted,
    activationKey,
    dismissedFeedbackActivationKey,
  ]);

  const canSubmitFeedback = useMemo(() => {
    if (!activeFeedbackForm || feedbackSubmitted) return false;
    return activeFeedbackForm.scales.every((scale) => {
      const answer = scaleAnswers[scale.id];
      if (isFeedbackScaleMulti(scale)) {
        if (!Array.isArray(answer) || answer.length < 1) return false;
        const maxAnswers = resolveFeedbackMultiMaxAnswers(scale);
        return (
          answer.length <= maxAnswers &&
          answer.every((idx) => idx >= 0 && idx < scale.options.length)
        );
      }
      return typeof answer === "number" && answer >= 0 && answer < scale.options.length;
    });
  }, [activeFeedbackForm, feedbackSubmitted, scaleAnswers]);

  const selectScaleOption = useCallback(
    (scaleId: string, optionIndex: number) => {
      const scale = activeFeedbackForm?.scales.find((item) => item.id === scaleId);
      if (!scale) return;
      if (isFeedbackScaleMulti(scale)) {
        const maxAnswers = resolveFeedbackMultiMaxAnswers(scale);
        setScaleAnswers((prev) => {
          const current = Array.isArray(prev[scaleId]) ? (prev[scaleId] as number[]) : [];
          if (current.includes(optionIndex)) {
            return { ...prev, [scaleId]: current.filter((idx) => idx !== optionIndex) };
          }
          if (current.length >= maxAnswers) return prev;
          return { ...prev, [scaleId]: [...current, optionIndex] };
        });
        return;
      }
      setScaleAnswers((prev) => ({ ...prev, [scaleId]: optionIndex }));
    },
    [activeFeedbackForm],
  );

  const setOpenFieldAnswer = useCallback((fieldId: string, value: string) => {
    setOpenFieldAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const closeFeedbackPopup = useCallback(() => {
    if (!activationKey) return;
    setDismissedFeedbackActivationKey(activationKey);
  }, [activationKey]);

  const submitFeedback = useCallback(() => {
    if (!quizId || !activeFeedbackForm || !canSubmitFeedback || submitting || feedbackSubmitted) {
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const trimmedAnswers = Object.fromEntries(
      Object.entries(openFieldAnswers)
        .map(([fieldId, value]) => [fieldId, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
    socket.emit("feedback:submit", {
      quizId,
      scaleAnswers,
      openFieldAnswers: trimmedAnswers,
    });
  }, [
    quizId,
    activeFeedbackForm,
    canSubmitFeedback,
    submitting,
    feedbackSubmitted,
    scaleAnswers,
    openFieldAnswers,
  ]);

  return {
    shouldShowFeedbackPopup,
    shouldDeferQuestionPopup,
    feedbackSubmitted,
    scaleAnswers,
    openFieldAnswers,
    setOpenFieldAnswer,
    selectScaleOption,
    closeFeedbackPopup,
    canSubmitFeedback,
    submitFeedback,
    submitting,
    submitError,
  };
}
