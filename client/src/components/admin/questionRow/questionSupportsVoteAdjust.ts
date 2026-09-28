import { isGeoPollPreset } from "@meyouquize/shared";
import type { QuestionForm } from "../../../admin/adminEventForm";

/** Ручная правка счётчиков голосов — не для облака, ранжирования и geo-poll. */
export function questionSupportsVoteAdjust(question: QuestionForm): boolean {
  if (isGeoPollPreset(question)) return false;
  return question.type !== "tag_cloud" && question.type !== "ranking";
}
