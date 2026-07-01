// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestionForm, SubQuizSheet } from "../../admin/adminEventForm";
import type { PublicViewMode } from "../../publicViewContract";
import {
  useAdminQuestionEditor,
  type UseAdminQuestionEditorParams,
} from "./useAdminQuestionEditor";

const { mockSocket, editorSpies } = vi.hoisted(() => ({
  mockSocket: { emit: vi.fn() },
  editorSpies: {
    setMessage: vi.fn(),
    emitPublicViewSet: vi.fn(),
    emitPublicViewPatch: vi.fn(),
    persistQuestions: vi.fn(async (forms: QuestionForm[]) => ({ questions: forms })),
    pinExpandedSubQuiz: vi.fn(),
    persistCloudManualSnapshot: vi.fn(),
    updateShowFirstCorrectAnswerer: vi.fn(),
  },
}));

vi.mock("../../socket", () => ({ socket: mockSocket }));

vi.mock("../../utils/randomUuid", () => ({
  randomUuid: () => "test-uuid",
}));

function baseQuestion(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    id: "q-1",
    subQuizId: "sq-1",
    text: "Question",
    type: "single",
    editorQuizMode: true,
    points: 1,
    maxAnswers: 1,
    options: [
      { text: "A", isCorrect: true },
      { text: "B", isCorrect: false },
    ],
    ...overrides,
  };
}

function baseSheet(overrides: Partial<SubQuizSheet> = {}): SubQuizSheet {
  return {
    id: "sq-1",
    title: "Quiz",
    questionFlowMode: "manual",
    ...overrides,
  };
}

type HarnessOptions = {
  initialForms?: QuestionForm[];
  initialSheets?: SubQuizSheet[];
  quizId?: string;
  persistQuestions?: UseAdminQuestionEditorParams["persistQuestions"];
};

function useEditorHarness(options: HarnessOptions = {}) {
  const [questionForms, setQuestionForms] = useState<QuestionForm[]>(
    options.initialForms ?? [baseQuestion()],
  );
  const [subQuizSheets, setSubQuizSheets] = useState<SubQuizSheet[]>(
    options.initialSheets ?? [baseSheet()],
  );
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [publicViewMode, setPublicViewMode] = useState<PublicViewMode>("title");
  const [publicViewQuestionId, setPublicViewQuestionId] = useState<string | undefined>();
  const [questionRevealStage, setQuestionRevealStage] = useState<"options" | "results">("options");
  const [resultsSubQuizId, setResultsSubQuizId] = useState("sq-1");
  const [playerVisibleResultQuestionIds, setPlayerVisibleResultQuestionIds] = useState<string[]>(
    [],
  );
  const [showFirstCorrectAnswerer, setShowFirstCorrectAnswerer] = useState(false);
  const syncedSubQuizIdsKeyRef = useRef("");
  const lastPersistQuestionsErrorRef = useRef<string | null>(null);

  const editor = useAdminQuestionEditor({
    quizId: options.quizId ?? "quiz-1",
    questionForms,
    setQuestionForms,
    subQuizSheets,
    setSubQuizSheets,
    selectedQuestionIndex,
    setSelectedQuestionIndex,
    setQuestionId: vi.fn() as Dispatch<SetStateAction<string>>,
    questionResults: [],
    persistQuestions: options.persistQuestions ?? editorSpies.persistQuestions,
    persistCloudManualSnapshot: editorSpies.persistCloudManualSnapshot,
    lastPersistQuestionsErrorRef,
    patchQuestionProjectorSettings: vi.fn(async () => true),
    patchQuestionAdminDone: vi.fn(async () => true),
    setMessage: editorSpies.setMessage,
    pinExpandedSubQuiz: editorSpies.pinExpandedSubQuiz,
    setExpandedSubQuizId: vi.fn() as Dispatch<SetStateAction<string | false>>,
    setRoomQuestionsTab: vi.fn() as Dispatch<SetStateAction<"votes" | "quizzes" | "feedback">>,
    syncedSubQuizIdsKeyRef,
    publicViewMode,
    publicViewQuestionId,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionRevealStage,
    emitPublicViewSet: editorSpies.emitPublicViewSet,
    emitPublicViewPatch: editorSpies.emitPublicViewPatch,
    resultsSubQuizId,
    setResultsSubQuizId,
    playerVisibleResultQuestionIds,
    setPlayerVisibleResultQuestionIds,
    playerTiles: {
      playerQuizResultsSubQuizIds: [],
      playerQuizResultsSubQuizId: "",
      playerQuizResultsTileVisible: false,
      playerTilesOrder: [],
      applyPrunedPlayerUi: vi.fn(() => []),
    } as unknown as UseAdminQuestionEditorParams["playerTiles"],
    adminReport: {
      reportVoteQuestionIds: [],
      reportQuizQuestionIds: [],
      reportQuizSubQuizIds: [],
      applyPrunedRefs: vi.fn(),
    } as unknown as UseAdminQuestionEditorParams["adminReport"],
    showFirstCorrectAnswerer,
    setShowFirstCorrectAnswerer,
    updateShowFirstCorrectAnswerer: editorSpies.updateShowFirstCorrectAnswerer,
  });

  return {
    editor,
    questionForms,
    setQuestionForms,
    publicViewMode,
    setPublicViewMode,
  };
}

describe("useAdminQuestionEditor", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    Object.values(editorSpies).forEach((spy) => {
      if (typeof spy === "function" && "mockClear" in spy) {
        spy.mockClear();
      }
    });
    editorSpies.persistQuestions.mockImplementation(async (forms: QuestionForm[]) => ({
      questions: forms,
    }));
  });

  it("openQuestionDialog opens editor and cancel restores snapshot", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.openQuestionDialog(0);
    });
    expect(result.current.editor.isQuestionDialogOpen).toBe(true);

    act(() => {
      result.current.setQuestionForms([baseQuestion({ text: "Edited in dialog" })]);
    });
    expect(result.current.questionForms[0]?.text).toBe("Edited in dialog");

    act(() => {
      result.current.editor.cancelQuestionDialog();
    });
    expect(result.current.editor.isQuestionDialogOpen).toBe(false);
    expect(result.current.questionForms[0]?.text).toBe("Question");
  });

  it("saveQuestionDialogAndClose persists and closes on success", async () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.openQuestionDialog(0);
    });

    await act(async () => {
      await result.current.editor.saveQuestionDialogAndClose();
    });

    expect(editorSpies.persistQuestions).toHaveBeenCalled();
    expect(result.current.editor.isQuestionDialogOpen).toBe(false);
    expect(editorSpies.setMessage).toHaveBeenCalledWith("Вопросы сохранены");
    expect(editorSpies.pinExpandedSubQuiz).toHaveBeenCalledWith("sq-1");
  });

  it("saveQuestionDialogAndClose sets dialog error when validation fails", async () => {
    const { result } = renderHook(() =>
      useEditorHarness({
        initialForms: [
          baseQuestion({
            text: "",
            options: [{ text: "", isCorrect: true }],
          }),
        ],
      }),
    );

    act(() => {
      result.current.editor.openQuestionDialog(0);
    });

    await act(async () => {
      await result.current.editor.saveQuestionDialogAndClose();
    });

    expect(editorSpies.persistQuestions).not.toHaveBeenCalled();
    expect(result.current.editor.isQuestionDialogOpen).toBe(true);
    expect(result.current.editor.questionDialogError).toMatch(/укажите текст/i);
  });

  it("setPublicResultsView emits projector state for question mode", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.setPublicResultsView("question", "q-1");
    });

    expect(editorSpies.emitPublicViewSet).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "question",
        questionId: "q-1",
        questionRevealStage: "options",
        showFirstCorrectAnswerer: false,
      }),
    );
    expect(result.current.publicViewMode).toBe("question");
  });

  it("setPublicResultsView reports missing quiz id", () => {
    const { result } = renderHook(() => useEditorHarness({ quizId: "" }));

    act(() => {
      result.current.editor.setPublicResultsView("title");
    });

    expect(editorSpies.setMessage).toHaveBeenCalledWith("Quiz ID не найден");
    expect(editorSpies.emitPublicViewSet).not.toHaveBeenCalled();
  });

  it("toggleQuestion emits socket event when question is saved", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.toggleQuestion(0, true);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("question:toggle", {
      quizId: "quiz-1",
      questionId: "q-1",
      enabled: true,
    });
  });

  it("requestRemoveSubQuizSheet opens confirm dialog", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.requestRemoveSubQuizSheet("sq-1");
    });

    expect(result.current.editor.confirmDeleteSubQuizId).toBe("sq-1");
  });

  it("updateQuestion applies ranking defaults via patch helper", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.openQuestionDialog(0);
      result.current.editor.updateQuestion(0, { type: "ranking" });
    });

    expect(result.current.questionForms[0]?.type).toBe("ranking");
    expect(result.current.questionForms[0]?.rankingKind).toBe("jury");
    expect(result.current.questionForms[0]?.options.length).toBeGreaterThanOrEqual(3);
  });

  it("togglePlayerVisibleResultQuestionId patches public view", () => {
    const { result } = renderHook(() => useEditorHarness());

    act(() => {
      result.current.editor.togglePlayerVisibleResultQuestionId("q-1");
    });

    expect(editorSpies.emitPublicViewPatch).toHaveBeenCalledWith({
      playerVisibleResultQuestionIds: ["q-1"],
    });
  });
});
