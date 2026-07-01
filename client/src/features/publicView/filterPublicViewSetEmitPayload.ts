import { isPlayerOnlyPublicViewStateKey } from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../publicViewContract";

function patchHasKey(patch: PublicViewSetPatch, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

/**
 * Для emitPublicViewSet: player-only поля не включаются в payload,
 * если их нет в patch — иначе локальный state админки перезаписывает сервер при смене режима проектора.
 */
export function filterPublicViewSetEmitPayload<T extends Record<string, unknown>>(
  patch: PublicViewSetPatch,
  payload: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isPlayerOnlyPublicViewStateKey(key) && !patchHasKey(patch, key)) {
      continue;
    }
    out[key] = value;
  }
  return out as T;
}
