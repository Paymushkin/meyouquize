import { flushSync } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { randomUuid } from "../../utils/randomUuid";
import { socket } from "../../socket";
import {
  buildTagResultsDisplayOrder,
  clearCountOverrideRow,
  clearQuestionManualFields,
  mergeInjectedTagWords,
  parseInjectedTagLines,
  setTagCountOverrideRow,
  toggleHiddenTagText,
} from "../tagCloudAdmin";
import {
  cloneQuestionForm,
  createEmptyQuestion,
  isEditorQuizMode,
  normalizeTagCloudQuestionPoints,
  validateQuestionsForm,
  validateSheetsHaveSubQuizId,
  type OptionForm,
  type QuestionForm,
  type SubQuizSheet,
} from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import type { useAdminPlayerTiles } from "./useAdminPlayerTiles";
import type { useAdminReport } from "./useAdminReport";
import type { RoomQuestionsTab } from "./adminUiPersistence";
import {
  cloneQuestionForms,
  patchOptionAtIndex,
  patchQuestionAtIndex,
} from "./adminQuestionFormPatch";
import { prunePlayerUiRefsForRoom, type PublicViewSetPatch } from "../../publicViewContract";
import type { PublicViewMode } from "../../publicViewContract";

export type UseAdminQuestionEditorParams = {
  quizId: string;
  questionForms: QuestionForm[];
  setQuestionForms: Dispatch<SetStateAction<QuestionForm[]>>;
  subQuizSheets: SubQuizSheet[];
  setSubQuizSheets: Dispatch<SetStateAction<SubQuizSheet[]>>;
  selectedQuestionIndex: number;
  setSelectedQuestionIndex: Dispatch<SetStateAction<number>>;
  setQuestionId: Dispatch<SetStateAction<string>>;
  questionResults: QuestionResult[];
  persistQuestions: (
    forms: QuestionForm[],
    sheets: SubQuizSheet[],
    opts?: { suppressToast?: boolean },
  ) => Promise<false | { questions: QuestionForm[] }>;
  persistCloudManualSnapshot: (forms: QuestionForm[]) => void;
  lastPersistQuestionsErrorRef: RefObject<string | null>;
  patchQuestionProjectorSettings: (
    questionId: string,
    patch: Record<string, unknown>,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => Promise<boolean>;
  patchQuestionAdminDone: (
    questionId: string,
    adminDone: boolean,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => Promise<boolean>;
  setMessage: (message: string) => void;
  pinExpandedSubQuiz: (subQuizId: string) => void;
  setExpandedSubQuizId: Dispatch<SetStateAction<string | false>>;
  setRoomQuestionsTab: Dispatch<SetStateAction<RoomQuestionsTab>>;
  syncedSubQuizIdsKeyRef: RefObject<string>;
  publicViewMode: PublicViewMode;
  publicViewQuestionId: string | undefined;
  setPublicViewMode: Dispatch<SetStateAction<PublicViewMode>>;
  setPublicViewQuestionId: Dispatch<SetStateAction<string | undefined>>;
  setQuestionRevealStage: Dispatch<SetStateAction<"options" | "results">>;
  emitPublicViewSet: (patch: PublicViewSetPatch) => void;
  emitPublicViewPatch: (patch: PublicViewSetPatch) => void;
  resultsSubQuizId: string;
  setResultsSubQuizId: Dispatch<SetStateAction<string>>;
  playerVisibleResultQuestionIds: string[];
  setPlayerVisibleResultQuestionIds: Dispatch<SetStateAction<string[]>>;
  playerTiles: ReturnType<typeof useAdminPlayerTiles>;
  adminReport: ReturnType<typeof useAdminReport>;
  showFirstCorrectAnswerer: boolean;
  setShowFirstCorrectAnswerer: Dispatch<SetStateAction<boolean>>;
  updateShowFirstCorrectAnswerer: (next: boolean, questionIdForProjector?: string) => void;
};

export function useAdminQuestionEditor({
  quizId,
  questionForms,
  setQuestionForms,
  subQuizSheets,
  setSubQuizSheets,
  selectedQuestionIndex,
  setSelectedQuestionIndex,
  setQuestionId,
  questionResults,
  persistQuestions,
  persistCloudManualSnapshot,
  lastPersistQuestionsErrorRef,
  patchQuestionProjectorSettings,
  patchQuestionAdminDone,
  setMessage,
  pinExpandedSubQuiz,
  setExpandedSubQuizId,
  setRoomQuestionsTab,
  syncedSubQuizIdsKeyRef,
  publicViewMode,
  publicViewQuestionId,
  setPublicViewMode,
  setPublicViewQuestionId,
  setQuestionRevealStage,
  emitPublicViewSet,
  emitPublicViewPatch,
  resultsSubQuizId,
  setResultsSubQuizId,
  playerVisibleResultQuestionIds,
  setPlayerVisibleResultQuestionIds,
  playerTiles,
  adminReport,
  showFirstCorrectAnswerer,
  setShowFirstCorrectAnswerer,
  updateShowFirstCorrectAnswerer,
}: UseAdminQuestionEditorParams) {
  const defaultRankingQuizHint =
    "Расставьте варианты от лучшего к худшему (первый в списке — лучший).";
  const defaultRankingJuryHint =
    "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется.";

  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionDialogError, setQuestionDialogError] = useState("");
  const questionDialogSnapshotRef = useRef<QuestionForm[] | null>(null);
  const questionDialogTargetSubQuizIdRef = useRef<string | null>(null);
  const [confirmResetQuestionIndex, setConfirmResetQuestionIndex] = useState<number | null>(null);
  const [confirmResetSubQuizAnswers, setConfirmResetSubQuizAnswers] = useState<{
    subQuizId: string;
    title: string;
  } | null>(null);
  const [confirmDeleteQuestionIndex, setConfirmDeleteQuestionIndex] = useState<number | null>(null);
  const [confirmDeleteSubQuizId, setConfirmDeleteSubQuizId] = useState<string | null>(null);
  const [tagInputDialogQuestionIndex, setTagInputDialogQuestionIndex] = useState<number | null>(
    null,
  );
  const [tagResultsDialogQuestionIndex, setTagResultsDialogQuestionIndex] = useState<number | null>(
    null,
  );
  const [tagResultsOrder, setTagResultsOrder] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [expandedQuestionSettingsIndex, setExpandedQuestionSettingsIndex] = useState<number | null>(
    null,
  );

  const rankingHints = { quiz: defaultRankingQuizHint, jury: defaultRankingJuryHint };

  function addSubQuizSheet() {
    const id = `new-${randomUuid()}`;
    setSubQuizSheets((prev) => {
      const next = [...prev, { id, title: "Новый квиз", questionFlowMode: "manual" as const }];
      syncedSubQuizIdsKeyRef.current = [...next]
        .map((s) => s.id)
        .sort()
        .join(",");
      return next;
    });
    setExpandedSubQuizId(id);
    setRoomQuestionsTab("quizzes");
  }

  async function removeSubQuizSheet(sqId: string) {
    console.info("[admin][subquiz-delete] requested", {
      subQuizId: sqId,
      hasWindow: typeof window !== "undefined",
    });
    console.info("[admin][subquiz-delete] applying delete", { subQuizId: sqId });
    const nextSheets = subQuizSheets.filter((s) => s.id !== sqId);
    const nextForms = questionForms.filter((q) => q.subQuizId !== sqId);
    const formErr = validateQuestionsForm(nextForms);
    if (formErr) {
      setMessage(formErr);
      return;
    }
    const sheetErr = validateSheetsHaveSubQuizId(nextSheets, nextForms);
    if (sheetErr) {
      setMessage(sheetErr);
      return;
    }
    const prevSelectedId = questionForms[selectedQuestionIndex]?.id;
    if (isQuestionDialogOpen && questionForms[selectedQuestionIndex]?.subQuizId === sqId) {
      questionDialogSnapshotRef.current = null;
      questionDialogTargetSubQuizIdRef.current = null;
      closeQuestionDialog();
    }
    setSubQuizSheets(nextSheets);
    setQuestionForms(nextForms);
    setSelectedQuestionIndex(() => {
      if (nextForms.length === 0) return 0;
      if (prevSelectedId) {
        const ni = nextForms.findIndex((q) => q.id === prevSelectedId);
        if (ni >= 0) return ni;
      }
      return 0;
    });
    const persisted = await persistQuestions(nextForms, nextSheets);
    if (persisted !== false) {
      const validSubQuizIds = new Set(nextSheets.map((s) => s.id));
      const validQuestionIds = new Set(
        nextForms
          .map((q) => q.id)
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      );
      const prunedPlayerUi = prunePlayerUiRefsForRoom(
        {
          playerQuizResultsSubQuizIds: playerTiles.playerQuizResultsSubQuizIds,
          playerQuizResultsSubQuizId: playerTiles.playerQuizResultsSubQuizId,
          playerQuizResultsTileVisible: playerTiles.playerQuizResultsTileVisible,
          playerTilesOrder: playerTiles.playerTilesOrder,
          playerVisibleResultQuestionIds,
          leaderboardSubQuizId: resultsSubQuizId,
          reportVoteQuestionIds: adminReport.reportVoteQuestionIds,
          reportQuizQuestionIds: adminReport.reportQuizQuestionIds,
          reportQuizSubQuizIds: adminReport.reportQuizSubQuizIds,
        },
        validSubQuizIds,
        validQuestionIds,
      );
      const nextTilesOrder = playerTiles.applyPrunedPlayerUi(prunedPlayerUi);
      setPlayerVisibleResultQuestionIds(prunedPlayerUi.playerVisibleResultQuestionIds);
      if (resultsSubQuizId !== prunedPlayerUi.leaderboardSubQuizId) {
        setResultsSubQuizId(prunedPlayerUi.leaderboardSubQuizId);
      }
      adminReport.applyPrunedRefs({
        reportVoteQuestionIds: prunedPlayerUi.reportVoteQuestionIds,
        reportQuizQuestionIds: prunedPlayerUi.reportQuizQuestionIds,
        reportQuizSubQuizIds: prunedPlayerUi.reportQuizSubQuizIds,
      });
      emitPublicViewSet({
        ...prunedPlayerUi,
        playerTilesOrder: nextTilesOrder,
      });
      setMessage("Квиз удалён");
      if (nextForms.length === 0) setQuestionId("");
    }
  }

  function requestRemoveSubQuizSheet(sqId: string) {
    console.info("[admin][subquiz-delete] open-confirm-dialog", { subQuizId: sqId });
    setConfirmDeleteSubQuizId(sqId);
  }

  function closeDeleteSubQuizDialog() {
    setConfirmDeleteSubQuizId(null);
  }

  async function runConfirmedRemoveSubQuiz() {
    if (!confirmDeleteSubQuizId) return;
    const sqId = confirmDeleteSubQuizId;
    closeDeleteSubQuizDialog();
    await removeSubQuizSheet(sqId);
  }

  function addQuestionToSubQuiz(sqId: string | null) {
    setQuestionDialogError("");
    questionDialogTargetSubQuizIdRef.current = sqId;
    if (sqId) {
      pinExpandedSubQuiz(sqId);
    }
    questionDialogSnapshotRef.current = cloneQuestionForms(questionForms);
    const newQ = createEmptyQuestion(sqId);
    if (sqId == null) {
      newQ.editorQuizMode = false;
      newQ.options = newQ.options.map((opt) => ({ ...opt, isCorrect: false }));
    }
    setQuestionForms((prev) => {
      let insertAt = prev.length;
      if (sqId !== null) {
        let last = -1;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].subQuizId === sqId) last = i;
        }
        insertAt = last === -1 ? prev.length : last + 1;
      } else {
        let last = -1;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].subQuizId == null) last = i;
        }
        insertAt = last === -1 ? prev.length : last + 1;
      }
      const next = [...prev];
      next.splice(insertAt, 0, newQ);
      setSelectedQuestionIndex(insertAt);
      setIsQuestionDialogOpen(true);
      return next;
    });
  }

  async function cloneQuestionAtIndex(globalIndex: number) {
    const source = questionForms[globalIndex];
    if (!source) return;
    if (!source.id) {
      setMessage("Сначала сохраните голосование");
      return;
    }
    const prevIds = new Set(
      questionForms.map((q) => q.id).filter((id): id is string => Boolean(id)),
    );
    const cloned = cloneQuestionForm(source);
    const insertAt = globalIndex + 1;
    const next = [...questionForms];
    next.splice(insertAt, 0, cloned);
    const formErr = validateQuestionsForm(next);
    if (formErr) {
      setMessage(formErr);
      return;
    }
    setQuestionForms(next);
    const merged = await persistQuestions(next, subQuizSheets, { suppressToast: true });
    if (merged === false) {
      setQuestionForms(questionForms);
      return;
    }
    const newIndex = merged.questions.findIndex((q) => q.id && !prevIds.has(q.id));
    const targetIndex = newIndex >= 0 ? newIndex : insertAt;
    setSelectedQuestionIndex(targetIndex);
    questionDialogSnapshotRef.current = cloneQuestionForms(merged.questions);
    questionDialogTargetSubQuizIdRef.current = source.subQuizId ?? null;
    setIsQuestionDialogOpen(true);
    setMessage("Голосование скопировано");
  }

  async function removeQuestion(index: number) {
    const removed = questionForms[index];
    const subQuizIdForAccordion =
      removed?.subQuizId != null && removed.subQuizId !== "" ? removed.subQuizId : null;
    const next = questionForms.filter((_, i) => i !== index);
    const err = validateQuestionsForm(next);
    if (err) {
      setQuestionDialogError(err);
      return;
    }
    setQuestionForms(next);
    setSelectedQuestionIndex((current) => {
      if (next.length === 0) return 0;
      if (index < current) return current - 1;
      if (index === current) return Math.max(0, current - 1);
      return current;
    });
    questionDialogSnapshotRef.current = null;
    questionDialogTargetSubQuizIdRef.current = null;
    closeQuestionDialog();
    const persisted = await persistQuestions(next, subQuizSheets);
    if (persisted !== false) {
      setMessage("Вопросы сохранены");
      if (next.length === 0) setQuestionId("");
      if (subQuizIdForAccordion) {
        pinExpandedSubQuiz(subQuizIdForAccordion);
      }
    }
  }

  function requestRemoveQuestion(index: number) {
    setConfirmDeleteQuestionIndex(index);
  }

  function closeDeleteQuestionDialog() {
    setConfirmDeleteQuestionIndex(null);
  }

  async function runConfirmedRemoveQuestion() {
    if (confirmDeleteQuestionIndex === null) return;
    const index = confirmDeleteQuestionIndex;
    closeDeleteQuestionDialog();
    await removeQuestion(index);
  }

  function updateQuestion(index: number, patch: Partial<QuestionForm>) {
    setQuestionForms((prev) => patchQuestionAtIndex(prev, index, patch, rankingHints));
  }

  function addOption(questionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const nextOpts = [
          ...q.options,
          { text: "", isCorrect: q.type === "tag_cloud" && isEditorQuizMode(q) },
        ];
        if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
          const n = nextOpts.length;
          const base = [...(q.rankingPointsByRank ?? []), 1];
          while (base.length < n) base.push(1);
          return { ...q, options: nextOpts, rankingPointsByRank: base.slice(0, n) };
        }
        if (q.type !== "ranking") return { ...q, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...q,
          options: nextOpts,
          rankingPointsByRank:
            q.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const minOpts =
          q.type === "tag_cloud" && isEditorQuizMode(q) ? 1 : q.type === "ranking" ? 3 : 2;
        if (q.options.length <= minOpts) return q;
        const nextOpts = q.options.filter((_, oi) => oi !== optionIndex);
        if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
          const base = (q.rankingPointsByRank ?? []).filter((_, oi) => oi !== optionIndex);
          return { ...q, options: nextOpts, rankingPointsByRank: base };
        }
        if (q.type !== "ranking") return { ...q, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...q,
          options: nextOpts,
          rankingPointsByRank:
            q.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
  }

  function fillRankingTiersDescending(questionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "ranking") return q;
        const n = q.options.length;
        return {
          ...q,
          rankingPointsByRank: Array.from({ length: n }, (_, j) => Math.max(1, n - j)),
        };
      }),
    );
  }

  function setTagCloudTagPointsAt(questionIndex: number, tagIdx: number, raw: string) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "tag_cloud" || !isEditorQuizMode(q)) return q;
        const n = q.options.length;
        const base = [...(q.rankingPointsByRank ?? Array.from({ length: n }, () => 1))];
        while (base.length < n) base.push(1);
        const v =
          raw.trim() === "" ? 1 : Math.min(10_000, Math.max(0, Math.trunc(Number(raw)) || 0));
        base[tagIdx] = v;
        return { ...q, rankingPointsByRank: base };
      }),
    );
  }

  function setRankingTierAt(questionIndex: number, rankIdx: number, raw: string) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "ranking") return q;
        const n = q.options.length;
        const base = [
          ...(q.rankingPointsByRank ??
            Array.from({ length: n }, () => (q.rankingKind === "jury" ? 0 : 1))),
        ];
        while (base.length < n) base.push(0);
        const v =
          raw.trim() === ""
            ? q.rankingKind === "jury"
              ? 0
              : 1
            : q.rankingKind === "jury"
              ? Math.min(10_000, Math.max(0, Math.trunc(Number(raw)) || 0))
              : Math.min(n, Math.max(1, Math.trunc(Number(raw)) || 1));
        base[rankIdx] = v;
        if (q.rankingKind === "jury") {
          const allZero = base.every((x) => x === 0);
          return { ...q, rankingPointsByRank: allZero ? null : base };
        }
        return { ...q, rankingPointsByRank: base };
      }),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<OptionForm>) {
    setQuestionForms((prev) => patchOptionAtIndex(prev, questionIndex, optionIndex, patch));
  }

  function resetQuestionAnswersByIndex(index: number) {
    const question = questionForms[index];
    if (!quizId || !question?.id) {
      setMessage("Сначала сохраните вопросы, чтобы сбрасывать ответы");
      return;
    }
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) => (idx === index ? clearQuestionManualFields(q) : q));
      void persistCloudManualSnapshot(next);
      return next;
    });
    socket.emit("admin:answers:reset-question", {
      quizId,
      questionId: question.id,
    });
    setMessage("Ответы и ручные правки по выбранному вопросу обнулены");
  }

  function confirmResetQuestionAnswersByIndex(index: number) {
    setConfirmResetQuestionIndex(index);
  }

  function runConfirmedResetQuestionAnswers() {
    if (confirmResetQuestionIndex === null) return;
    const index = confirmResetQuestionIndex;
    setConfirmResetQuestionIndex(null);
    resetQuestionAnswersByIndex(index);
  }

  function confirmResetSubQuizAnswersById(subQuizId: string, title: string) {
    setConfirmResetSubQuizAnswers({ subQuizId, title });
  }

  function runConfirmedResetSubQuizAnswers() {
    if (!quizId || !confirmResetSubQuizAnswers) return;
    const { subQuizId, title } = confirmResetSubQuizAnswers;
    setConfirmResetSubQuizAnswers(null);
    socket.emit("admin:answers:reset-sub-quiz", { quizId, subQuizId });
    setMessage(`Ответы и ручные правки по квизу «${title}» обнулены`);
  }

  function toggleQuestion(questionIndex: number, enabled: boolean) {
    const question = questionForms[questionIndex];
    if (!quizId || !question?.id) {
      setMessage("Сначала сохраните вопросы, чтобы управлять их запуском");
      return;
    }
    socket.emit("question:toggle", {
      quizId,
      questionId: question.id,
      enabled,
    });
    if (enabled) {
      setQuestionId(question.id);
      setQuestionForms((prev) =>
        prev.map((q, idx) => ({
          ...q,
          isActive: idx === questionIndex,
        })),
      );
    } else {
      setQuestionForms((prev) =>
        prev.map((q, idx) => ({
          ...q,
          isActive: idx === questionIndex ? false : q.isActive,
        })),
      );
    }
  }

  const setPublicResultsView = useCallback(
    (
      mode: "title" | "question" | "leaderboard" | "speaker_questions" | "reactions" | "randomizer",
      questionIdForMode?: string,
      extraPatch?: PublicViewSetPatch,
    ) => {
      if (!quizId) {
        setMessage("Quiz ID не найден");
        return;
      }
      const nextQuestionId = mode === "question" ? questionIdForMode : undefined;
      if (mode === "question" && !nextQuestionId) {
        setMessage("Не выбран вопрос для экрана");
        return;
      }
      const targetQuestion =
        mode === "question" && nextQuestionId
          ? questionForms.find((q) => q.id === nextQuestionId)
          : undefined;
      const nextQuestionRevealStage =
        mode === "question" && targetQuestion?.type !== "tag_cloud" ? "options" : "results";
      const leaderboardSubQuizIdForEmit =
        mode === "leaderboard"
          ? (extraPatch?.leaderboardSubQuizId ?? resultsSubQuizId ?? "").trim() || undefined
          : undefined;
      if (mode === "leaderboard" && leaderboardSubQuizIdForEmit) {
        setResultsSubQuizId(leaderboardSubQuizIdForEmit);
      }
      setShowFirstCorrectAnswerer(false);
      setPublicViewMode(mode);
      setPublicViewQuestionId(nextQuestionId);
      setQuestionRevealStage(nextQuestionRevealStage);
      emitPublicViewSet({
        mode,
        questionId: nextQuestionId,
        questionRevealStage: nextQuestionRevealStage,
        showCorrectOption: targetQuestion?.showCorrectOption ?? false,
        showFirstCorrectAnswerer: false,
        ...(leaderboardSubQuizIdForEmit
          ? { leaderboardSubQuizId: leaderboardSubQuizIdForEmit }
          : {}),
        ...extraPatch,
      });
    },
    [
      emitPublicViewSet,
      questionForms,
      quizId,
      resultsSubQuizId,
      setPublicViewMode,
      setPublicViewQuestionId,
      setQuestionRevealStage,
      setShowFirstCorrectAnswerer,
      setResultsSubQuizId,
      setMessage,
    ],
  );

  function setQuestionRevealStageForQuestion(
    questionIdForProjector: string,
    stage: "options" | "results",
  ) {
    if (!quizId) {
      setMessage("Quiz ID не найден");
      return;
    }
    setPublicViewMode("question");
    setPublicViewQuestionId(questionIdForProjector);
    setQuestionRevealStage(stage);
    emitPublicViewSet({
      mode: "question",
      questionId: questionIdForProjector,
      questionRevealStage: stage,
      showFirstCorrectAnswerer: false,
    });
  }
  function updateQuestionShowVoteCount(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showVoteCount: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: next,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowCorrectOption(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showCorrectOption: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      showCorrectOption: next,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowTitle(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showQuestionTitle: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: next,
    });
  }

  async function toggleQuestionAdminDone(globalIndex: number) {
    const prev = questionForms[globalIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    const nextDone = !prev.adminDone;
    const nextForms = questionForms.map((q, idx) =>
      idx === globalIndex ? { ...q, adminDone: nextDone } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionAdminDone(prev.id, nextDone, subQuizSheets, nextForms, quizId);
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) => (idx === globalIndex ? { ...q, adminDone: prev.adminDone } : q)),
      );
    }
  }

  async function reorderVoteInList(
    fromLocalIndex: number,
    toLocalIndex: number,
    scopeIndices: number[],
  ) {
    if (fromLocalIndex === toLocalIndex) return;
    if (
      fromLocalIndex < 0 ||
      toLocalIndex < 0 ||
      fromLocalIndex >= scopeIndices.length ||
      toLocalIndex >= scopeIndices.length
    ) {
      return;
    }

    const orderedGlobals = [...scopeIndices];
    const [removed] = orderedGlobals.splice(fromLocalIndex, 1);
    if (removed === undefined) return;
    orderedGlobals.splice(toLocalIndex, 0, removed);

    const scopePositions = [...scopeIndices].sort((a, b) => a - b);
    const reorderedQuestions = orderedGlobals.map((globalIndex) => questionForms[globalIndex]!);

    const snapshot = questionForms;
    const next = [...questionForms];
    scopePositions.forEach((position, index) => {
      next[position] = reorderedQuestions[index]!;
    });
    setQuestionForms(next);

    const merged = await persistQuestions(next, subQuizSheets, { suppressToast: true });
    if (!merged) {
      setQuestionForms(snapshot);
      setMessage("Не удалось изменить порядок");
    }
  }

  async function updateQuestionProjectorShowFirstCorrect(questionIndex: number, next: boolean) {
    const prev = questionForms[questionIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    const previousSwitch = prev.projectorShowFirstCorrect ?? true;
    const nextForms = questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, projectorShowFirstCorrect: next } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionProjectorSettings(
      prev.id,
      { projectorShowFirstCorrect: next },
      subQuizSheets,
      nextForms,
      quizId,
    );
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, projectorShowFirstCorrect: previousSwitch } : q,
        ),
      );
    }
  }

  async function updateQuestionRankingProjectorMetric(
    questionIndex: number,
    value: "avg_rank" | "avg_score" | "total_score",
  ) {
    const prev = questionForms[questionIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    if (prev.type !== "ranking") return;
    const previousMetric = prev.rankingProjectorMetric ?? "avg_score";
    const nextForms = questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, rankingProjectorMetric: value } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionProjectorSettings(
      prev.id,
      { rankingProjectorMetric: value },
      subQuizSheets,
      nextForms,
      quizId,
    );
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, rankingProjectorMetric: previousMetric } : q,
        ),
      );
    }
  }

  function patchQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, next: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(next) ? next : 1)));
    setQuestionForms((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      ),
    );
  }

  function commitQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    setQuestionForms((prev) => {
      const previousCount = prev[questionIndex]?.projectorFirstCorrectWinnersCount ?? 1;
      const qid = prev[questionIndex]?.id;
      const nextForms = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      );
      queueMicrotask(() => {
        void (async () => {
          if (!qid) {
            setMessage("Сначала сохраните вопрос");
            setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
            return;
          }
          const ok = await patchQuestionProjectorSettings(
            qid,
            { projectorFirstCorrectWinnersCount: safe },
            subQuizSheets,
            nextForms,
            quizId,
          );
          if (!ok) {
            setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
          }
        })();
      });
      return nextForms;
    });
  }

  function toggleTagVisibility(questionIndex: number, tagText: string) {
    const question = questionForms[questionIndex];
    const nextHidden = toggleHiddenTagText(question.hiddenTagTexts ?? [], tagText);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, hiddenTagTexts: nextHidden } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function applyInjectedTagList(questionIndex: number) {
    const question = questionForms[questionIndex];
    const parsed = parseInjectedTagLines(question.injectedTagsInput ?? "");
    if (parsed.length === 0) {
      setMessage("Список пустой или формат неверный. Используйте строки вида: слово 10");
      return;
    }
    const nextWords = mergeInjectedTagWords(question.injectedTagWords ?? [], parsed);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, injectedTagWords: nextWords, injectedTagsInput: "" } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
    setMessage("Список ответов добавлен");
  }

  function updateTagCountOverride(questionIndex: number, tagText: string, nextCount: number) {
    const question = questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(
      question.tagCountOverrides ?? [],
      tagText,
      nextCount,
    );
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearTagCountOverride(questionIndex: number, tagText: string) {
    const question = questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.tagCountOverrides ?? [], tagText);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function updateOptionVoteCountOverride(
    questionIndex: number,
    optionId: string,
    nextCount: number,
  ) {
    const question = questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(
      question.optionVoteCountOverrides ?? [],
      optionId,
      nextCount,
    );
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearOptionVoteCountOverride(questionIndex: number, optionId: string) {
    const question = questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.optionVoteCountOverrides ?? [], optionId);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function resetOptionVoteCountOverrides(questionIndex: number) {
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: [] } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function openTagInputDialog(questionIndex: number) {
    setTagInputDialogQuestionIndex(questionIndex);
  }

  function closeTagInputDialog() {
    setTagInputDialogQuestionIndex(null);
  }

  function applyInjectedTagListFromDialog() {
    if (tagInputDialogQuestionIndex === null) return;
    applyInjectedTagList(tagInputDialogQuestionIndex);
    closeTagInputDialog();
  }

  function openTagResultsDialog(questionIndex: number) {
    const question = questionForms[questionIndex];
    const result = question?.id
      ? questionResults.find((item) => item.questionId === question.id)
      : undefined;
    const tags = result?.tagCloud ?? [];
    const injected = question?.injectedTagWords ?? [];
    const overrides = question?.tagCountOverrides ?? [];
    setTagResultsOrder(buildTagResultsDisplayOrder({ liveTags: tags, injected, overrides }));
    setTagResultsDialogQuestionIndex(questionIndex);
  }

  function closeTagResultsDialog() {
    setTagResultsDialogQuestionIndex(null);
    setTagResultsOrder([]);
  }

  function openQuestionDialog(index: number) {
    setQuestionDialogError("");
    setQuestionForms((prev) => {
      const next = prev.map((item, i) =>
        i === index && item.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(item) : item,
      );
      questionDialogSnapshotRef.current = cloneQuestionForms(next);
      return next;
    });
    const q = questionForms[index];
    const sid = q?.subQuizId;
    questionDialogTargetSubQuizIdRef.current =
      sid != null && String(sid).trim() !== "" ? String(sid) : null;
    setSelectedQuestionIndex(index);
    setIsQuestionDialogOpen(true);
  }

  function closeQuestionDialog() {
    setIsQuestionDialogOpen(false);
  }

  function cancelQuestionDialog() {
    setQuestionDialogError("");
    questionDialogTargetSubQuizIdRef.current = null;
    if (questionDialogSnapshotRef.current) {
      setQuestionForms(questionDialogSnapshotRef.current);
      questionDialogSnapshotRef.current = null;
    }
    closeQuestionDialog();
  }

  async function saveQuestionDialogAndClose() {
    const idx = selectedQuestionIndex;
    const current = questionForms[idx];
    const formsForSave = questionForms.map((q) =>
      q.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(q) : q,
    );
    const listErr = validateQuestionsForm(formsForSave);
    if (listErr) {
      setQuestionDialogError(listErr);
      return;
    }
    if (formsForSave.some((q, i) => q !== questionForms[i])) {
      setQuestionForms(formsForSave);
    }
    questionDialogSnapshotRef.current = null;
    const merged = await persistQuestions(formsForSave, subQuizSheets, {
      suppressToast: true,
    });
    if (merged === false) {
      setQuestionDialogError(
        lastPersistQuestionsErrorRef.current ??
          "Не удалось сохранить вопросы. Проверьте соединение и попробуйте ещё раз.",
      );
      return;
    }
    setQuestionDialogError("");
    setMessage("Вопросы сохранены");
    questionDialogTargetSubQuizIdRef.current = null;

    /** subQuizId из ответа сервера после merge — id подквиза мог смениться (new-* → cuid), до сохранения нельзя полагаться на ref. */
    const mq = merged.questions;
    let targetSubQuizId: string | null = null;
    if (current?.id) {
      const hit = mq.find((q) => q.id === current.id);
      if (hit?.subQuizId != null && String(hit.subQuizId).trim() !== "") {
        targetSubQuizId = String(hit.subQuizId);
      }
    }
    if (targetSubQuizId == null && idx >= 0 && idx < mq.length) {
      const at = mq[idx];
      if (at?.subQuizId != null && String(at.subQuizId).trim() !== "") {
        targetSubQuizId = String(at.subQuizId);
      }
    }
    if (targetSubQuizId) {
      pinExpandedSubQuiz(targetSubQuizId);
    }
    closeQuestionDialog();
  }

  function commitNewOption() {
    const value = newOptionText.trim();
    if (!value) return;
    setQuestionForms((prev) =>
      prev.map((question, index) => {
        if (index !== selectedQuestionIndex) return question;
        const nextOpts = [
          ...question.options,
          {
            text: value,
            isCorrect: question.type === "tag_cloud" && isEditorQuizMode(question),
          },
        ];
        if (question.type === "tag_cloud" && isEditorQuizMode(question)) {
          const n = nextOpts.length;
          const base = [...(question.rankingPointsByRank ?? []), 1];
          while (base.length < n) base.push(1);
          return { ...question, options: nextOpts, rankingPointsByRank: base.slice(0, n) };
        }
        if (question.type !== "ranking") return { ...question, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...question,
          options: nextOpts,
          rankingPointsByRank:
            question.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
    setNewOptionText("");
  }

  function togglePlayerVisibleResultQuestionId(questionIdForTile: string) {
    setPlayerVisibleResultQuestionIds((prev) => {
      const next = prev.includes(questionIdForTile)
        ? prev.filter((x) => x !== questionIdForTile)
        : [...prev, questionIdForTile];
      emitPublicViewPatch({ playerVisibleResultQuestionIds: next });
      return next;
    });
  }

  useEffect(() => {
    setNewOptionText("");
  }, [isQuestionDialogOpen, selectedQuestionIndex]);

  useEffect(() => {
    if (!isQuestionDialogOpen) return;
    setQuestionDialogError("");
  }, [questionForms, isQuestionDialogOpen]);

  useEffect(() => {
    if (!isQuestionDialogOpen) return;
    setQuestionForms((prev) => {
      const q = prev[selectedQuestionIndex];
      if (!q) return prev;
      if (q.subQuizId == null && q.type === "tag_cloud") {
        if (q.editorQuizMode && q.options.length >= 2) return prev;
        const hasCorrect = q.options.some((o) => o.isCorrect);
        return prev.map((qq, i) =>
          i !== selectedQuestionIndex
            ? qq
            : {
                ...qq,
                editorQuizMode: true,
                options:
                  qq.options.length >= 2
                    ? hasCorrect
                      ? qq.options
                      : qq.options.map((o, oi) => ({ ...o, isCorrect: oi === 0 }))
                    : [
                        { text: "", isCorrect: true },
                        { text: "", isCorrect: false },
                      ],
              },
        );
      }
      if (q.subQuizId == null) return prev;
      if (q.type === "tag_cloud") {
        return prev.map((qq, i) =>
          i !== selectedQuestionIndex
            ? qq
            : normalizeTagCloudQuestionPoints({ ...qq, editorQuizMode: true }),
        );
      }
      if (q.editorQuizMode) return prev;
      const hasCorrect = q.options.some((o) => o.isCorrect);
      return prev.map((qq, i) =>
        i !== selectedQuestionIndex
          ? qq
          : {
              ...qq,
              editorQuizMode: true,
              options: hasCorrect
                ? qq.options
                : qq.options.map((o, oi) => ({ ...o, isCorrect: oi === 0 })),
            },
      );
    });
  }, [isQuestionDialogOpen, selectedQuestionIndex, setQuestionForms]);

  return {
    isQuestionDialogOpen,
    questionDialogError,
    setQuestionDialogError,
    newOptionText,
    setNewOptionText,
    tagInputDialogQuestionIndex,
    tagResultsDialogQuestionIndex,
    tagResultsOrder,
    expandedQuestionSettingsIndex,
    setExpandedQuestionSettingsIndex,
    confirmResetQuestionIndex,
    setConfirmResetQuestionIndex,
    confirmResetSubQuizAnswers,
    setConfirmResetSubQuizAnswers,
    confirmDeleteQuestionIndex,
    confirmDeleteSubQuizId,
    defaultRankingQuizHint,
    defaultRankingJuryHint,
    addSubQuizSheet,
    requestRemoveSubQuizSheet,
    closeDeleteSubQuizDialog,
    runConfirmedRemoveSubQuiz,
    addQuestionToSubQuiz,
    cloneQuestionAtIndex,
    requestRemoveQuestion,
    closeDeleteQuestionDialog,
    runConfirmedRemoveQuestion,
    updateQuestion,
    removeOption,
    fillRankingTiersDescending,
    setTagCloudTagPointsAt,
    setRankingTierAt,
    updateOption,
    confirmResetQuestionAnswersByIndex,
    runConfirmedResetQuestionAnswers,
    confirmResetSubQuizAnswersById,
    runConfirmedResetSubQuizAnswers,
    toggleQuestion,
    setPublicResultsView,
    setQuestionRevealStageForQuestion,
    updateQuestionShowVoteCount,
    updateQuestionShowCorrectOption,
    toggleQuestionAdminDone,
    reorderVoteInList,
    updateQuestionProjectorShowFirstCorrect,
    updateQuestionRankingProjectorMetric,
    patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount,
    toggleTagVisibility,
    updateTagCountOverride,
    clearTagCountOverride,
    applyInjectedTagListFromDialog,
    closeTagInputDialog,
    closeTagResultsDialog,
    openQuestionDialog,
    cancelQuestionDialog,
    saveQuestionDialogAndClose,
    commitNewOption,
    openTagInputDialog,
    openTagResultsDialog,
    updateOptionVoteCountOverride,
    clearOptionVoteCountOverride,
    resetOptionVoteCountOverrides,
    togglePlayerVisibleResultQuestionId,
  };
}
