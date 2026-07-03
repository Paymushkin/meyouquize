/** Сегменты URL глобальной админки — не имена комнат. */
export const RESERVED_ADMIN_EVENT_NAMES = new Set(["fonts", "themes"]);

export function isReservedAdminEventName(eventName: string | undefined): boolean {
  return Boolean(eventName && RESERVED_ADMIN_EVENT_NAMES.has(eventName));
}
