import type { PublicViewPayload, PublicViewState } from "@meyouquize/shared";

export function toPublicViewPayload(view: PublicViewState, title: string): PublicViewPayload {
  return {
    ...view,
    title,
  };
}
