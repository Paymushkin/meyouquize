// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SpeakerQuestionsPayload } from "../../types/speakerQuestions";
import { SpeakerQuestionsDialog } from "./SpeakerQuestionsDialog";

const basePayload: SpeakerQuestionsPayload = {
  settings: {
    enabled: true,
    speakers: ["Иванов"],
    reactions: ["👍", "🔥"],
  },
  items: [],
};

function renderDialog(
  overrides: Partial<ComponentProps<typeof SpeakerQuestionsDialog>> = {},
  payloadOverrides?: Partial<SpeakerQuestionsPayload>,
) {
  const props = {
    open: true,
    speakerQuestions: { ...basePayload, ...payloadOverrides },
    speakerName: "Все спикеры",
    speakerQuestionText: "",
    formBackgroundColor: "#F3F722",
    formTextColor: "#000000",
    formInputTextColor: "#ffffff",
    onClose: vi.fn(),
    onSpeakerNameChange: vi.fn(),
    onSpeakerQuestionTextChange: vi.fn(),
    onSubmit: vi.fn(),
    onReact: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<SpeakerQuestionsDialog {...props} />);
  return props;
}

describe("SpeakerQuestionsDialog", () => {
  it("shows subtitle without mine tab when player has no own questions", () => {
    renderDialog(undefined, {
      items: [
        {
          id: "q1",
          speakerName: "Иванов",
          text: "Публичный вопрос",
          authorNickname: "Анна",
          status: "PENDING",
          userVisible: true,
          isOnScreen: false,
          isMine: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(screen.getByText("Актуальные вопросы")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Мои вопросы" })).toBeNull();
    expect(screen.getByText("Публичный вопрос")).toBeTruthy();
  });

  it("shows tabs when player has own questions", () => {
    renderDialog(undefined, {
      items: [
        {
          id: "mine",
          speakerName: "Все спикеры",
          text: "Мой черновик",
          authorNickname: "Борис",
          status: "PENDING",
          userVisible: false,
          isOnScreen: false,
          isMine: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "public",
          speakerName: "Иванов",
          text: "Общий вопрос",
          authorNickname: "Анна",
          status: "PENDING",
          userVisible: true,
          isOnScreen: false,
          isMine: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(screen.getByRole("tab", { name: "Актуальные вопросы" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Мои вопросы" })).toBeTruthy();
    expect(screen.getByText("Общий вопрос")).toBeTruthy();
    expect(screen.queryByText("Мой черновик")).toBeNull();
  });

  it("shows delete control in mine tab and calls onDelete", () => {
    const props = renderDialog(undefined, {
      items: [
        {
          id: "mine",
          speakerName: "Все спикеры",
          text: "Удалить меня",
          authorNickname: "Борис",
          status: "PENDING",
          userVisible: false,
          isOnScreen: false,
          isMine: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: "Мои вопросы" }));
    fireEvent.click(screen.getByLabelText("Удалить вопрос"));
    expect(props.onDelete).toHaveBeenCalledWith("mine");
  });

  it("lists user-visible questions in actual tab including own published ones", () => {
    renderDialog(undefined, {
      items: [
        {
          id: "mine-public",
          speakerName: "Все спикеры",
          text: "Мой опубликованный",
          authorNickname: "Борис",
          status: "PENDING",
          userVisible: true,
          isOnScreen: false,
          isMine: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "other",
          speakerName: "Иванов",
          text: "Чужой опубликованный",
          authorNickname: "Анна",
          status: "APPROVED",
          userVisible: true,
          isOnScreen: false,
          isMine: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(screen.getByText("Мой опубликованный")).toBeTruthy();
    expect(screen.getByText("Чужой опубликованный")).toBeTruthy();
  });
});
