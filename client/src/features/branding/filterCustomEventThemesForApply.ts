import { isSystemEventThemeId } from "@meyouquize/shared";
import type { EventThemeListOption } from "../../components/admin/branding/EventThemeApplySection";

type EventThemeApiListItem = EventThemeListOption & { system?: boolean };

/** Для селектора применения темы к ивенту — без встроенных default/meyou. */
export function filterCustomEventThemesForApply(
  items: EventThemeApiListItem[],
): EventThemeListOption[] {
  return items.filter((item) => !item.system && !isSystemEventThemeId(item.id));
}
