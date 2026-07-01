export function getRoomJoinKey(slug: string) {
  return `mq_joined_${slug}`;
}

export function getRoomNickKey(slug: string) {
  return `mq_nickname_${slug}`;
}

export function wasRoomJoined(slug: string): boolean {
  return localStorage.getItem(getRoomJoinKey(slug)) === "1";
}

export function hasPersistedNickname(slug: string): boolean {
  const roomNickname = localStorage.getItem(getRoomNickKey(slug)) || "";
  const persistedNick = roomNickname || "";
  return persistedNick.trim().length > 0;
}

export function shouldRestoreJoin(slug: string, globalNickname: string): boolean {
  const roomNickname = slug ? localStorage.getItem(getRoomNickKey(slug)) : "";
  const persistedNick = roomNickname || globalNickname || "";
  return Boolean(slug) && wasRoomJoined(slug) && persistedNick.trim().length > 0;
}

export function markRoomJoined(slug: string) {
  localStorage.setItem(getRoomJoinKey(slug), "1");
}

export function clearRoomJoined(slug: string) {
  localStorage.removeItem(getRoomJoinKey(slug));
}
