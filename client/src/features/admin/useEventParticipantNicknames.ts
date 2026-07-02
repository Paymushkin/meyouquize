import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../config";

async function fetchParticipantNicknames(eventName: string): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/participants`,
    { credentials: "include" },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as { nicknames?: unknown };
  return Array.isArray(payload.nicknames)
    ? payload.nicknames.filter((item): item is string => typeof item === "string")
    : [];
}

/** Актуальный список ников участников комнаты (для рандомайзера и др.). */
export function useEventParticipantNicknames(eventName: string, isAuth: boolean) {
  const [eventParticipantNicknames, setEventParticipantNicknames] = useState<string[]>([]);

  const refreshEventParticipantNicknames = useCallback(async (): Promise<string[]> => {
    if (!eventName || !isAuth) return [];
    const nicknames = await fetchParticipantNicknames(eventName);
    setEventParticipantNicknames(nicknames);
    return nicknames;
  }, [eventName, isAuth]);

  useEffect(() => {
    if (!eventName || !isAuth) {
      setEventParticipantNicknames([]);
      return;
    }
    void refreshEventParticipantNicknames();
    const intervalId = window.setInterval(() => {
      void refreshEventParticipantNicknames();
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [eventName, isAuth, refreshEventParticipantNicknames]);

  return { eventParticipantNicknames, refreshEventParticipantNicknames };
}
