import { describe, expect, it } from "vitest";
import {
  mapFeedbackResultsToReportItem,
  parseFeedbackOpenFields,
  parseFeedbackScales,
} from "../src/feedback-service.js";

function buildMockFeedbackResults(
  formId: string,
  title: string,
  responseCount: number,
): NonNullable<Parameters<typeof mapFeedbackResultsToReportItem>[0]> {
  return {
    form: {
      id: formId,
      quizId: "quiz-1",
      title,
      isActive: false,
      isClosed: true,
      scales: [
        {
          id: "s1",
          label: "Как вам?",
          options: ["😞", "😐", "🙂", "😊", "🤩"],
        },
      ],
      openFields: [
        {
          id: "f1",
          label: "Комментарий",
          placeholder: "Комментарий",
        },
      ],
      commentEnabled: true,
      commentPlaceholder: "Комментарий",
    },
    responseCount,
    scaleStats: [
      {
        scaleId: "s1",
        label: "Как вам?",
        options: ["😞", "😐", "🙂", "😊", "🤩"],
        counts: responseCount > 0 ? [0, 0, responseCount, 0, 0] : [0, 0, 0, 0, 0],
        average: responseCount > 0 ? 3 : null,
        responseCount,
      },
    ],
    responses:
      responseCount > 0
        ? [
            {
              nickname: "Анна",
              scaleAnswers: { s1: 2 },
              openFieldAnswers: { f1: "Отлично" },
              comment: "Отлично",
              submittedAt: new Date().toISOString(),
            },
          ]
        : [],
  };
}

describe("parseFeedbackOpenFields", () => {
  it("parses configured open fields", () => {
    const fields = parseFeedbackOpenFields(
      [{ id: "f1", label: "Идеи", placeholder: "Ваши идеи" }],
      false,
      "",
    );
    expect(fields).toEqual([{ id: "f1", label: "Идеи", placeholder: "Ваши идеи" }]);
  });

  it("falls back to legacy comment field", () => {
    const fields = parseFeedbackOpenFields([], true, "Что улучшить?");
    expect(fields).toHaveLength(1);
    expect(fields[0]?.label).toBe("Комментарий");
    expect(fields[0]?.placeholder).toBe("Что улучшить?");
  });
});

describe("parseFeedbackScales", () => {
  it("parses valid scales with five options", () => {
    const scales = parseFeedbackScales([
      {
        id: "s1",
        label: "Как вам?",
        options: ["😞", "😐", "🙂", "😊", "🤩"],
      },
    ]);
    expect(scales).toHaveLength(1);
    expect(scales[0]?.label).toBe("Как вам?");
    expect(scales[0]?.options).toEqual(["😞", "😐", "🙂", "😊", "🤩"]);
  });

  it("parses scales with two to ten options", () => {
    const scales = parseFeedbackScales([{ id: "s1", label: "X", options: ["1", "2", "3"] }]);
    expect(scales).toHaveLength(1);
    expect(scales[0]?.options).toEqual(["1", "2", "3"]);
  });

  it("rejects invalid option counts", () => {
    expect(parseFeedbackScales([{ id: "s1", label: "X", options: ["1"] }])).toHaveLength(0);
    expect(
      parseFeedbackScales([
        {
          id: "s1",
          label: "X",
          options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
        },
      ]),
    ).toHaveLength(0);
  });
});

describe("mapFeedbackResultsToReportItem", () => {
  it("maps form metadata and stats for report", () => {
    const item = mapFeedbackResultsToReportItem(
      buildMockFeedbackResults("f1", "После первого блока", 2),
    );
    expect(item).toEqual({
      formId: "f1",
      title: "После первого блока",
      responseCount: 2,
      openFields: expect.arrayContaining([expect.objectContaining({ id: "f1" })]),
      scaleStats: expect.arrayContaining([
        expect.objectContaining({ scaleId: "s1", responseCount: 2 }),
      ]),
      responses: expect.arrayContaining([
        expect.objectContaining({ nickname: "Анна", openFieldAnswers: { f1: "Отлично" } }),
      ]),
    });
  });

  it("maps multiple forms independently", () => {
    const first = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f1", "Форма A", 3));
    const second = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f2", "Форма B", 1));
    expect(first.formId).toBe("f1");
    expect(second.formId).toBe("f2");
    expect(first.title).toBe("Форма A");
    expect(second.title).toBe("Форма B");
  });
});

describe("getFeedbackResultsForReport filtering", () => {
  it("includes only forms with responses when building report items", () => {
    const raw = [
      buildMockFeedbackResults("f1", "Форма A", 2),
      buildMockFeedbackResults("f2", "Форма B", 0),
      buildMockFeedbackResults("f3", "Форма C", 5),
    ];
    const items = raw.filter((item) => item.responseCount > 0).map(mapFeedbackResultsToReportItem);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.formId)).toEqual(["f1", "f3"]);
    expect(items.map((item) => item.title)).toEqual(["Форма A", "Форма C"]);
  });
});
