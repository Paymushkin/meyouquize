import { describe, expect, it } from "vitest";
import {
  buildReportModuleDisplayOrder,
  normalizeReportModulesForAdmin,
} from "./adminReportModules";

describe("buildReportModuleDisplayOrder", () => {
  it("keeps enabled modules in report order and appends disabled ones", () => {
    expect(
      buildReportModuleDisplayOrder(["banners_summary", "event_header", "quiz_results"]),
    ).toEqual([
      "banners_summary",
      "event_header",
      "quiz_results",
      "participation_summary",
      "vote_results",
      "reactions_summary",
      "feedback_summary",
      "randomizer_summary",
      "speaker_questions_summary",
    ]);
  });
});

describe("normalizeReportModulesForAdmin", () => {
  it("does not re-add banners_summary when it was explicitly disabled", () => {
    expect(
      normalizeReportModulesForAdmin([
        "event_header",
        "participation_summary",
        "quiz_results",
        "vote_results",
        "reactions_summary",
        "feedback_summary",
        "randomizer_summary",
        "speaker_questions_summary",
      ]),
    ).not.toContain("banners_summary");
  });
});
