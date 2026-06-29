// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveFeedbackForm } from "../../types/feedback";
import { FeedbackPopupCard } from "./FeedbackPopupCard";

const form: ActiveFeedbackForm = {
  id: "fb-1",
  title: "Feedback",
  scales: [
    {
      id: "scale-1",
      label: "How was the event?",
      options: ["Bad", "OK", "Good", "Great", "Excellent"],
    },
  ],
  openFields: [
    {
      id: "field-1",
      label: "Your thoughts",
      placeholder: "Share feedback",
    },
  ],
  commentEnabled: true,
  commentPlaceholder: "Your thoughts",
  isClosed: false,
};

describe("FeedbackPopupCard", () => {
  it("renders scale labels and keeps submit disabled until allowed", () => {
    render(
      <FeedbackPopupCard
        brandPrimaryColor="#7c5acb"
        playerVoteOptionTextColor="#ffffff"
        form={form}
        scaleAnswers={{}}
        openFieldAnswers={{}}
        onOpenFieldChange={vi.fn()}
        onSelectOption={vi.fn()}
        onClose={vi.fn()}
        canSubmit={false}
        submitting={false}
        onSubmit={vi.fn()}
        submittedFlash={false}
      />,
    );

    expect(screen.getByText("How was the event?")).toBeTruthy();
    expect(screen.getByText("Your thoughts")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Отправить ответ" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows success flash after submit", () => {
    render(
      <FeedbackPopupCard
        brandPrimaryColor="#7c5acb"
        playerVoteOptionTextColor="#ffffff"
        form={form}
        scaleAnswers={{ "scale-1": 4 }}
        openFieldAnswers={{}}
        onOpenFieldChange={vi.fn()}
        onSelectOption={vi.fn()}
        onClose={vi.fn()}
        canSubmit
        submitting={false}
        onSubmit={vi.fn()}
        submittedFlash
      />,
    );

    expect(screen.getByText("Спасибо! Ваш отзыв отправлен.")).toBeTruthy();
  });

  it("calls onSelectOption when scale option clicked", () => {
    const onSelectOption = vi.fn();
    render(
      <FeedbackPopupCard
        brandPrimaryColor="#7c5acb"
        playerVoteOptionTextColor="#ffffff"
        form={form}
        scaleAnswers={{}}
        openFieldAnswers={{}}
        onOpenFieldChange={vi.fn()}
        onSelectOption={onSelectOption}
        onClose={vi.fn()}
        canSubmit={false}
        submitting={false}
        onSubmit={vi.fn()}
        submittedFlash={false}
      />,
    );

    fireEvent.click(screen.getByText("Good"));
    expect(onSelectOption).toHaveBeenCalledWith("scale-1", 2);
  });
});
