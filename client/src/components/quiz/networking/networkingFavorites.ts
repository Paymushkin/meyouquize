import type { NetworkingGuest } from "../../../features/quizPlay/usePlayerNetworking";

export function networkingFavoritesStorageKey(quizId: string): string {
  return `mq:networking:favorites:${quizId}`;
}

export function loadFavoriteGuests(quizId: string): Record<string, NetworkingGuest> {
  try {
    const raw = localStorage.getItem(networkingFavoritesStorageKey(quizId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, NetworkingGuest>;
  } catch {
    return {};
  }
}

export function saveFavoriteGuests(quizId: string, map: Record<string, NetworkingGuest>): void {
  localStorage.setItem(networkingFavoritesStorageKey(quizId), JSON.stringify(map));
}

export function loadFavoriteParticipantIds(quizId: string): Set<string> {
  return new Set(Object.keys(loadFavoriteGuests(quizId)));
}
