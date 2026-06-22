import type { PublicViewPayload, PublicViewState } from "@meyouquize/shared";
import { withProjectorTagCloudFields } from "@meyouquize/shared";

export function toPublicViewPayload(view: PublicViewState, title: string): PublicViewPayload {
  return {
    ...withProjectorTagCloudFields(view),
    title,
  };
}
