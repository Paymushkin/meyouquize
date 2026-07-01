import { socket } from "../../socket";
import { publicViewPayloadKey, schedulePublicViewSocketEmit } from "./publicViewEmitCoordination";

export function emitAdminPublicViewSet(payload: Record<string, unknown>) {
  schedulePublicViewSocketEmit(() => {
    socket.emit("admin:results:view:set", payload);
  }, publicViewPayloadKey(payload));
}

/** Только явные поля патча — без снимка mode/question/облака (не дёргает проектор). */
export function emitAdminPublicViewPatch(patch: Record<string, unknown>) {
  schedulePublicViewSocketEmit(() => {
    socket.emit("admin:results:view:set", patch);
  }, publicViewPayloadKey(patch));
}
