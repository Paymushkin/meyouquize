import { socket } from "../../socket";
import {
  publicViewPayloadKey,
  schedulePublicViewSocketEmit,
  schedulePublicViewSocketEmitImmediate,
} from "./publicViewEmitCoordination";

/** Поля настроек отчёта — всегда шлём сразу, без coalesce с чужим pending. */
const REPORT_PATCH_KEYS = new Set([
  "reportTitle",
  "reportModules",
  "reportVoteQuestionIds",
  "reportQuizQuestionIds",
  "reportQuizSubQuizIds",
  "reportSubQuizHideParticipantTableIds",
  "reportRandomizerRunIds",
  "reportReactionsWidgetIds",
  "reportSpeakerQuestionIds",
  "reportFeedbackFormIds",
  "reportPublished",
]);

export function isReportSettingsPatch(patch: Record<string, unknown>): boolean {
  const keys = Object.keys(patch).filter((key) => key !== "quizId");
  return keys.length > 0 && keys.every((key) => REPORT_PATCH_KEYS.has(key));
}

export function emitAdminPublicViewSet(payload: Record<string, unknown>) {
  schedulePublicViewSocketEmit(() => {
    socket.emit("admin:results:view:set", payload);
  }, publicViewPayloadKey(payload));
}

/** Только явные поля патча — без снимка mode/question/облака (не дёргает проектор). */
export function emitAdminPublicViewPatch(patch: Record<string, unknown>) {
  if (isReportSettingsPatch(patch)) {
    emitAdminPublicViewPatchNow(patch);
    return;
  }
  schedulePublicViewSocketEmit(() => {
    socket.emit("admin:results:view:set", patch);
  }, publicViewPayloadKey(patch));
}

/** Сразу на сервер (настройки отчёта) — не теряется в debounce соседних патчей. */
export function emitAdminPublicViewPatchNow(patch: Record<string, unknown>) {
  schedulePublicViewSocketEmitImmediate(() => {
    socket.emit("admin:results:view:set", patch);
  }, publicViewPayloadKey(patch));
}
