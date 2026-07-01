import type { PublicViewPayload } from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../publicViewContract";
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ReportModuleId } from "../../publicViewContract";
import { DEFAULT_REPORT_MODULES, normalizeReportModulesForAdmin } from "./adminReportModules";
import type { RandomizerHistoryEntry } from "../randomizer/randomizerLogic";

type EmitPatch = (patch: PublicViewSetPatch) => void;

type QuizQuestionGroup = {
  subQuizId: string;
  questions: Array<{ id: string }>;
};

type ToggleContext = {
  availableVoteQuestionIds: string[];
  availableQuizQuestions: QuizQuestionGroup[];
  availableFeedbackFormIds: string[];
  reactionWidgetIds: string[];
  randomizerHistory: RandomizerHistoryEntry[];
  randomizerCurrentWinners: string[];
};

type Params = {
  emitPublicViewPatch: EmitPatch;
  onSpeakerQuestionIdsFromView?: (ids: unknown) => void;
};

export function useAdminReport({ emitPublicViewPatch, onSpeakerQuestionIdsFromView }: Params) {
  const onSpeakerQuestionIdsFromViewRef = useRef(onSpeakerQuestionIdsFromView);
  onSpeakerQuestionIdsFromViewRef.current = onSpeakerQuestionIdsFromView;

  const [reportTitle, setReportTitle] = useState("Отчет мероприятия");
  const [reportModules, setReportModules] = useState<ReportModuleId[]>(DEFAULT_REPORT_MODULES);
  const [reportVoteQuestionIds, setReportVoteQuestionIds] = useState<string[]>([]);
  const [reportQuizQuestionIds, setReportQuizQuestionIds] = useState<string[]>([]);
  const [reportQuizSubQuizIds, setReportQuizSubQuizIds] = useState<string[]>([]);
  const [reportSubQuizHideParticipantTableIds, setReportSubQuizHideParticipantTableIds] = useState<
    string[]
  >([]);
  const [reportRandomizerRunIds, setReportRandomizerRunIds] = useState<string[]>([]);
  const [reportReactionsWidgetIds, setReportReactionsWidgetIds] = useState<string[]>([]);
  const [reportFeedbackFormIds, setReportFeedbackFormIds] = useState<string[]>([]);
  const [availableFeedbackForms, setAvailableFeedbackForms] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [reportPublished, setReportPublished] = useState(false);

  const toggleContextRef = useRef<ToggleContext>({
    availableVoteQuestionIds: [],
    availableQuizQuestions: [],
    availableFeedbackFormIds: [],
    reactionWidgetIds: [],
    randomizerHistory: [],
    randomizerCurrentWinners: [],
  });

  const setToggleContext = useCallback((next: ToggleContext) => {
    toggleContextRef.current = next;
  }, []);

  const applyFromPublicView = useCallback((payload: PublicViewPayload) => {
    if (typeof payload.reportTitle === "string") {
      setReportTitle(payload.reportTitle);
    }
    if (Array.isArray(payload.reportModules)) {
      setReportModules(normalizeReportModulesForAdmin(payload.reportModules));
    }
    if (Array.isArray(payload.reportVoteQuestionIds)) {
      setReportVoteQuestionIds(
        payload.reportVoteQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportQuizQuestionIds)) {
      setReportQuizQuestionIds(
        payload.reportQuizQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportQuizSubQuizIds)) {
      setReportQuizSubQuizIds(
        payload.reportQuizSubQuizIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportSubQuizHideParticipantTableIds)) {
      setReportSubQuizHideParticipantTableIds(
        payload.reportSubQuizHideParticipantTableIds.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    }
    if (Array.isArray(payload.reportRandomizerRunIds)) {
      setReportRandomizerRunIds(
        payload.reportRandomizerRunIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportReactionsWidgetIds)) {
      setReportReactionsWidgetIds(
        payload.reportReactionsWidgetIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportSpeakerQuestionIds)) {
      onSpeakerQuestionIdsFromViewRef.current?.(payload.reportSpeakerQuestionIds);
    }
    if (Array.isArray(payload.reportFeedbackFormIds)) {
      setReportFeedbackFormIds(
        payload.reportFeedbackFormIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (typeof payload.reportPublished === "boolean") {
      setReportPublished(payload.reportPublished);
    }
  }, []);

  const applyPrunedRefs = useCallback(
    (pruned: {
      reportVoteQuestionIds: string[];
      reportQuizQuestionIds: string[];
      reportQuizSubQuizIds: string[];
    }) => {
      setReportVoteQuestionIds(pruned.reportVoteQuestionIds);
      setReportQuizQuestionIds(pruned.reportQuizQuestionIds);
      setReportQuizSubQuizIds(pruned.reportQuizSubQuizIds);
    },
    [],
  );

  const toggleReportModule = useCallback(
    (moduleId: ReportModuleId, enabled: boolean) => {
      setReportModules((prev) => {
        const next = enabled
          ? prev.includes(moduleId)
            ? prev
            : [...prev, moduleId]
          : prev.filter((id) => id !== moduleId);
        emitPublicViewPatch({ reportModules: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const moveReportModule = useCallback(
    (moduleId: ReportModuleId, direction: -1 | 1) => {
      setReportModules((prev) => {
        const index = prev.indexOf(moduleId);
        if (index < 0) return prev;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= prev.length) return prev;
        const next = [...prev];
        const temp = next[index];
        next[index] = next[nextIndex]!;
        next[nextIndex] = temp!;
        emitPublicViewPatch({ reportModules: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportVoteQuestion = useCallback(
    (questionId: string, enabled: boolean) => {
      const allIds = toggleContextRef.current.availableVoteQuestionIds;
      setReportVoteQuestionIds((prev) => {
        const current = prev.length === 0 ? [...allIds] : prev.filter((id) => allIds.includes(id));
        const next = enabled
          ? Array.from(new Set([...current, questionId]))
          : current.filter((id) => id !== questionId);
        emitPublicViewPatch({ reportVoteQuestionIds: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportQuizQuestion = useCallback(
    (questionId: string, enabled: boolean) => {
      const groups = toggleContextRef.current.availableQuizQuestions;
      const allIds = groups.flatMap((group) => group.questions.map((question) => question.id));
      const parentSubQuizId =
        groups.find((group) => group.questions.some((question) => question.id === questionId))
          ?.subQuizId ?? null;

      setReportQuizQuestionIds((prevQuestions) => {
        const current =
          prevQuestions.length === 0
            ? [...allIds]
            : prevQuestions.filter((id) => allIds.includes(id));
        const nextQuestions = enabled
          ? Array.from(new Set([...current, questionId]))
          : current.filter((id) => id !== questionId);

        setReportQuizSubQuizIds((prevSubQuizIds) => {
          const nextSubQuizIds = (() => {
            if (!parentSubQuizId) return prevSubQuizIds;
            const base =
              prevSubQuizIds.length === 0 ? groups.map((group) => group.subQuizId) : prevSubQuizIds;
            return enabled ? Array.from(new Set([...base, parentSubQuizId])) : base;
          })();
          emitPublicViewPatch({
            reportQuizQuestionIds: nextQuestions,
            reportQuizSubQuizIds: nextSubQuizIds,
          });
          return nextSubQuizIds;
        });

        return nextQuestions;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportQuiz = useCallback(
    (subQuizId: string, enabled: boolean) => {
      const groups = toggleContextRef.current.availableQuizQuestions;
      const group = groups.find((item) => item.subQuizId === subQuizId);
      if (!group) return;
      const allIds = groups.flatMap((item) => item.questions.map((question) => question.id));
      const groupIds = group.questions.map((question) => question.id);

      setReportQuizQuestionIds((prevQuestions) => {
        const current =
          prevQuestions.length === 0
            ? [...allIds]
            : prevQuestions.filter((id) => allIds.includes(id));
        const nextQuestions = enabled
          ? Array.from(new Set([...current, ...groupIds]))
          : current.filter((id) => !groupIds.includes(id));

        setReportQuizSubQuizIds((prevSubQuizIds) => {
          const nextSubQuizIds = enabled
            ? Array.from(
                new Set([
                  ...(prevSubQuizIds.length === 0
                    ? groups.map((item) => item.subQuizId)
                    : prevSubQuizIds),
                  subQuizId,
                ]),
              )
            : (prevSubQuizIds.length === 0
                ? groups.map((item) => item.subQuizId)
                : prevSubQuizIds
              ).filter((id) => id !== subQuizId);
          emitPublicViewPatch({
            reportQuizQuestionIds: nextQuestions,
            reportQuizSubQuizIds: nextSubQuizIds,
          });
          return nextSubQuizIds;
        });

        return nextQuestions;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportSubQuizParticipantTable = useCallback(
    (subQuizId: string, enabled: boolean) => {
      const allIds = toggleContextRef.current.availableQuizQuestions.map((item) => item.subQuizId);
      setReportSubQuizHideParticipantTableIds((prev) => {
        const base = prev.filter((id) => allIds.includes(id));
        const next = enabled
          ? base.filter((id) => id !== subQuizId)
          : Array.from(new Set([...base, subQuizId]));
        emitPublicViewPatch({ reportSubQuizHideParticipantTableIds: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const allReportRandomizerRunIds = useCallback(() => {
    const { randomizerHistory, randomizerCurrentWinners } = toggleContextRef.current;
    const ids = randomizerHistory.map((_, i) => `history:${i}`);
    if (randomizerCurrentWinners.length > 0) ids.push("current");
    return ids;
  }, []);

  const toggleReportRandomizerRun = useCallback(
    (runId: string, enabled: boolean) => {
      const all = allReportRandomizerRunIds();
      setReportRandomizerRunIds((prev) => {
        const current = prev.length === 0 ? [...all] : prev.filter((id) => all.includes(id));
        const next = enabled
          ? Array.from(new Set([...current, runId]))
          : current.filter((id) => id !== runId);
        emitPublicViewPatch({ reportRandomizerRunIds: next });
        return next;
      });
    },
    [allReportRandomizerRunIds, emitPublicViewPatch],
  );

  const toggleReportReactionsWidget = useCallback(
    (widgetId: string, enabled: boolean) => {
      const all = toggleContextRef.current.reactionWidgetIds;
      setReportReactionsWidgetIds((prev) => {
        const current = prev.length === 0 ? [...all] : prev.filter((id) => all.includes(id));
        const next = enabled
          ? Array.from(new Set([...current, widgetId]))
          : current.filter((id) => id !== widgetId);
        emitPublicViewPatch({ reportReactionsWidgetIds: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportFeedbackForm = useCallback(
    (formId: string, enabled: boolean) => {
      const all = toggleContextRef.current.availableFeedbackFormIds;
      setReportFeedbackFormIds((prev) => {
        const current = prev.length === 0 ? [...all] : prev.filter((id) => all.includes(id));
        const next = enabled
          ? Array.from(new Set([...current, formId]))
          : current.filter((id) => id !== formId);
        emitPublicViewPatch({ reportFeedbackFormIds: next });
        return next;
      });
    },
    [emitPublicViewPatch],
  );

  const toggleReportPublished = useCallback(
    (next: boolean, setMessage: (message: string) => void) => {
      setReportPublished(next);
      emitPublicViewPatch({ reportPublished: next });
      setMessage(next ? "Публичный отчет опубликован" : "Публичный отчет скрыт");
    },
    [emitPublicViewPatch],
  );

  return {
    reportTitle,
    setReportTitle,
    reportModules,
    reportVoteQuestionIds,
    reportQuizQuestionIds,
    reportQuizSubQuizIds,
    reportSubQuizHideParticipantTableIds,
    reportRandomizerRunIds,
    reportReactionsWidgetIds,
    reportFeedbackFormIds,
    setReportFeedbackFormIds: setReportFeedbackFormIds as Dispatch<SetStateAction<string[]>>,
    availableFeedbackForms,
    setAvailableFeedbackForms,
    reportPublished,
    setReportPublished,
    applyFromPublicView,
    applyPrunedRefs,
    setToggleContext,
    toggleReportModule,
    moveReportModule,
    toggleReportVoteQuestion,
    toggleReportQuizQuestion,
    toggleReportQuiz,
    toggleReportSubQuizParticipantTable,
    toggleReportRandomizerRun,
    toggleReportReactionsWidget,
    toggleReportFeedbackForm,
    toggleReportPublished,
  };
}

export type { QuizQuestionGroup, ToggleContext };
