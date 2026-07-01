import { describe, expect, it } from "vitest";
import {
  applyScaleCountOverridesToRaw,
  feedbackScaleOverrideKey,
  filterFeedbackFormsForReport,
  feedbackFormDisplayResponseCount,
  mapFeedbackResultsToReportItem,
  LEGACY_FEEDBACK_OPEN_FIELD_ID,
  parseFeedbackOpenFields,
  parseFeedbackScales,
  parseInjectedResponses,
  parseScaleCountOverrides,
  resolveSubmitOpenFieldAnswers,
  selectFeedbackFormsForReport,
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
    scaleCountOverrides: [],
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

  it("falls back to legacy comment field with stable id", () => {
    const fields = parseFeedbackOpenFields([], true, "Что улучшить?");
    expect(fields).toHaveLength(1);
    expect(fields[0]?.id).toBe(LEGACY_FEEDBACK_OPEN_FIELD_ID);
    expect(fields[0]?.label).toBe("Комментарий");
    expect(fields[0]?.placeholder).toBe("Что улучшить?");

    const again = parseFeedbackOpenFields([], true, "Что улучшить?");
    expect(again[0]?.id).toBe(LEGACY_FEEDBACK_OPEN_FIELD_ID);
  });
});

describe("resolveSubmitOpenFieldAnswers", () => {
  const openFields = [{ id: LEGACY_FEEDBACK_OPEN_FIELD_ID, label: "Комментарий", placeholder: "" }];

  it("accepts answers keyed with stale random id for single legacy field", () => {
    const answers = resolveSubmitOpenFieldAnswers(openFields, {
      "stale-random-uuid": "  Отлично  ",
    });
    expect(answers).toEqual({ [LEGACY_FEEDBACK_OPEN_FIELD_ID]: "Отлично" });
  });

  it("rejects unknown field ids when multiple fields configured", () => {
    expect(() =>
      resolveSubmitOpenFieldAnswers(
        [
          { id: "f1", label: "A", placeholder: "" },
          { id: "f2", label: "B", placeholder: "" },
        ],
        { wrong: "text" },
      ),
    ).toThrow("Invalid feedback payload");
  });
});

describe("parseInjectedResponses", () => {
  it("parses injected open-field responses", () => {
    const rows = parseInjectedResponses([
      {
        id: "inj-1",
        nickname: "Гость",
        openFieldAnswers: { f1: "Отлично" },
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
    ]);
    expect(rows).toEqual([
      {
        id: "inj-1",
        nickname: "Гость",
        openFieldAnswers: { f1: "Отлично" },
        submittedAt: "2026-06-28T12:00:00.000Z",
      },
    ]);
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

describe("feedback scale count overrides", () => {
  it("builds stable override keys", () => {
    expect(feedbackScaleOverrideKey("scale-1", 0)).toBe("scale-1:0");
    expect(feedbackScaleOverrideKey("scale-1", 2)).toBe("scale-1:2");
  });

  it("parses override rows from json", () => {
    expect(
      parseScaleCountOverrides([
        { text: "s1:0", count: 5 },
        { text: "bad", count: "x" },
      ]),
    ).toEqual([{ text: "s1:0", count: 5 }]);
  });

  it("applies overrides to raw counts", () => {
    const overrides = [{ text: feedbackScaleOverrideKey("s1", 1), count: 42 }];
    expect(applyScaleCountOverridesToRaw("s1", [1, 2, 3], overrides)).toEqual([1, 42, 3]);
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

describe("getFeedbackResultsForReport selection", () => {
  it("keeps forms without participant responses for report display", () => {
    const raw = [
      buildMockFeedbackResults("f1", "Форма A", 2),
      buildMockFeedbackResults("f2", "Форма B", 0),
    ];
    const items = raw.map(mapFeedbackResultsToReportItem);
    const selected = selectFeedbackFormsForReport(items, []);

    expect(selected).toHaveLength(2);
    expect(selected.map((item) => item.formId)).toEqual(["f1", "f2"]);
  });
});

describe("feedbackFormDisplayResponseCount", () => {
  it("uses scale totals when only manual overrides exist", () => {
    const form = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f1", "A", 0));
    form.scaleStats[0]!.counts = [3, 7, 0, 0, 0];
    expect(feedbackFormDisplayResponseCount(form)).toBe(10);
  });

  it("prefers real response count when present", () => {
    const form = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f1", "A", 5));
    form.scaleStats[0]!.counts = [99, 0, 0, 0, 0];
    expect(feedbackFormDisplayResponseCount(form)).toBe(5);
  });
});

describe("filterFeedbackFormsForReport", () => {
  const forms = [
    mapFeedbackResultsToReportItem(buildMockFeedbackResults("f1", "Форма A", 2)),
    mapFeedbackResultsToReportItem(buildMockFeedbackResults("f2", "Форма B", 3)),
  ];

  it("returns all forms when reportFeedbackFormIds is empty", () => {
    expect(filterFeedbackFormsForReport(forms, [])).toEqual(forms);
  });

  it("filters to selected form ids", () => {
    expect(filterFeedbackFormsForReport(forms, ["f2"]).map((form) => form.formId)).toEqual(["f2"]);
  });

  it("falls back to all forms when report ids are stale", () => {
    expect(filterFeedbackFormsForReport(forms, ["missing-id"])).toEqual(forms);
  });
});

describe("selectFeedbackFormsForReport", () => {
  const withData = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f1", "A", 2));
  const empty = mapFeedbackResultsToReportItem(buildMockFeedbackResults("f2", "B", 0));

  it("returns forms with responses after id filter", () => {
    const out = selectFeedbackFormsForReport([withData, empty], ["f1"]);
    expect(out.map((form) => form.formId)).toEqual(["f1"]);
  });

  it("includes zero-response forms when selected", () => {
    const out = selectFeedbackFormsForReport([withData, empty], ["f2"]);
    expect(out.map((form) => form.formId)).toEqual(["f2"]);
  });
});
