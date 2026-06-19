// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveQuestion } from "../../pages/quiz-play/types";
import { QuestionPopupCard } from "./QuestionPopupCard";

function makeQuestion(overrides: Partial<ActiveQuestion> = {}): ActiveQuestion {
  return {
    id: "q1",
    text: "What is 2+2?",
    type: "single",
    scoringMode: "quiz",
    options: [
      { id: "o1", text: "Four" },
      { id: "o2", text: "Five" },
    ],
    isClosed: false,
    ...overrides,
  };
}

function renderPopup(overrides: Partial<ComponentProps<typeof QuestionPopupCard>> = {}) {
  const question = overrides.question ?? makeQuestion();
  return render(
    <QuestionPopupCard
      brandPrimaryColor="#7c5acb"
      playerVoteOptionTextColor="#ffffff"
      question={question}
      quizProgress={{ subQuizId: "sq1", index: 1, total: 2 }}
      displayedSelected={[]}
      answeredCurrentQuestion={false}
      submittedAnswers={{}}
      rankOrder={[]}
      rankRowRefs={{ current: new Map() }}
      moveRankOption={vi.fn()}
      toggleOption={vi.fn()}
      closeQuestionPopup={vi.fn()}
      tagAnswers={[""]}
      setTagAnswers={vi.fn()}
      canSubmit={false}
      submit={vi.fn()}
      ruBallLabel={(n) => `${n}`}
      {...overrides}
    />,
  );
}

describe("QuestionPopupCard", () => {
  it("renders single-choice question text and options", () => {
    renderPopup();
    expect(screen.getByText("What is 2+2?")).toBeTruthy();
    expect(screen.getByText("Four")).toBeTruthy();
    expect(screen.getByText("Five")).toBeTruthy();
  });

  it("shows accepted hint when provided", () => {
    renderPopup({ showAcceptedHint: true });
    expect(screen.getByText("Ответ принят")).toBeTruthy();
  });

  it("disables submit until canSubmit is true", () => {
    renderPopup({ canSubmit: false });
    expect(screen.getByRole("button", { name: "Отправить ответ" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("renders ranking question with hint", () => {
    renderPopup({
      question: makeQuestion({
        type: "ranking",
        options: [
          { id: "r1", text: "Best" },
          { id: "r2", text: "Worst" },
        ],
        rankingPlayerHint: "Расставьте варианты",
      }),
      rankOrder: ["r1", "r2"],
    });
    expect(screen.getByText("Расставьте варианты")).toBeTruthy();
  });

  it("calls closeQuestionPopup when close button clicked", () => {
    const closeQuestionPopup = vi.fn();
    renderPopup({ closeQuestionPopup });
    fireEvent.click(screen.getByLabelText("Закрыть"));
    expect(closeQuestionPopup).toHaveBeenCalled();
  });
});
