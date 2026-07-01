import type { ReportModuleId } from "../../publicViewContract";
import { backfillReportModules } from "@meyouquize/shared";

export const DEFAULT_REPORT_MODULES: ReportModuleId[] = [
  "event_header",
  "participation_summary",
  "quiz_results",
  "vote_results",
  "reactions_summary",
  "feedback_summary",
  "randomizer_summary",
  "speaker_questions_summary",
  "banners_summary",
];

export function normalizeReportModulesForAdmin(value: unknown): ReportModuleId[] {
  if (!Array.isArray(value)) return [...DEFAULT_REPORT_MODULES];
  const next: ReportModuleId[] = [];
  for (const item of value) {
    if (item === "question_results") {
      if (!next.includes("quiz_results")) next.push("quiz_results");
      if (!next.includes("vote_results")) next.push("vote_results");
      continue;
    }
    if (
      item === "event_header" ||
      item === "participation_summary" ||
      item === "quiz_results" ||
      item === "vote_results" ||
      item === "reactions_summary" ||
      item === "feedback_summary" ||
      item === "randomizer_summary" ||
      item === "speaker_questions_summary" ||
      item === "banners_summary"
    ) {
      if (!next.includes(item)) next.push(item);
    }
  }
  const base = next.length > 0 ? next : [...DEFAULT_REPORT_MODULES];
  return backfillReportModules(base, DEFAULT_REPORT_MODULES);
}

/** Порядок списка в админке: включённые модули как в отчёте, выключенные — в конце. */
export function buildReportModuleDisplayOrder(
  reportModules: ReportModuleId[],
  allModules: ReportModuleId[] = DEFAULT_REPORT_MODULES,
): ReportModuleId[] {
  return [...reportModules, ...allModules.filter((moduleId) => !reportModules.includes(moduleId))];
}
