import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../config";

export type AdminNetworkingGuest = {
  participantId: string;
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  avatarUrl: string;
  offers: string;
  seeking: string;
  visibleInDirectory: boolean;
  chatsCount: number;
  messagesCount: number;
};

export type AdminNetworkingGuestDraft = {
  nickname: string;
  fullName: string;
  jobTitle: string;
  company: string;
  offers: string;
  seeking: string;
  visibleInDirectory: boolean;
};

function toDraft(guest: AdminNetworkingGuest): AdminNetworkingGuestDraft {
  return {
    nickname: guest.nickname,
    fullName: guest.fullName,
    jobTitle: guest.jobTitle,
    company: guest.company,
    offers: guest.offers,
    seeking: guest.seeking,
    visibleInDirectory: guest.visibleInDirectory,
  };
}

export function useAdminNetworkingGuests(eventName: string, enabled: boolean) {
  const [guests, setGuests] = useState<AdminNetworkingGuest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AdminNetworkingGuestDraft>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!eventName || !enabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/networking-guests`,
        { credentials: "include" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Не удалось загрузить гостей");
      }
      const payload = (await response.json()) as { guests?: AdminNetworkingGuest[] };
      const rows = Array.isArray(payload.guests) ? payload.guests : [];
      setGuests(rows);
      const nextDrafts: Record<string, AdminNetworkingGuestDraft> = {};
      for (const row of rows) nextDrafts[row.participantId] = toDraft(row);
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить гостей");
    } finally {
      setLoading(false);
    }
  }, [enabled, eventName]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = useCallback(
    (participantId: string, patch: Partial<AdminNetworkingGuestDraft>) => {
      setDrafts((prev) => {
        const base = prev[participantId];
        if (!base) return prev;
        return { ...prev, [participantId]: { ...base, ...patch } };
      });
      setMessage("");
    },
    [],
  );

  const saveGuest = useCallback(
    async (participantId: string) => {
      const draft = drafts[participantId];
      if (!draft || !eventName) return;
      setSavingId(participantId);
      setError("");
      setMessage("");
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/networking-guests/${encodeURIComponent(participantId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Не удалось сохранить");
        }
        const payload = (await response.json()) as { guest?: AdminNetworkingGuest };
        const guest = payload.guest;
        if (!guest) throw new Error("Пустой ответ сервера");
        setGuests((prev) => prev.map((row) => (row.participantId === participantId ? guest : row)));
        setDrafts((prev) => ({ ...prev, [participantId]: toDraft(guest) }));
        setMessage("Сохранено");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить");
      } finally {
        setSavingId(null);
      }
    },
    [drafts, eventName],
  );

  const isDirty = useCallback(
    (participantId: string) => {
      const guest = guests.find((g) => g.participantId === participantId);
      const draft = drafts[participantId];
      if (!guest || !draft) return false;
      return (
        draft.nickname !== guest.nickname ||
        draft.fullName !== guest.fullName ||
        draft.jobTitle !== guest.jobTitle ||
        draft.company !== guest.company ||
        draft.offers !== guest.offers ||
        draft.seeking !== guest.seeking ||
        draft.visibleInDirectory !== guest.visibleInDirectory
      );
    },
    [drafts, guests],
  );

  return {
    guests,
    drafts,
    loading,
    savingId,
    error,
    message,
    load,
    updateDraft,
    saveGuest,
    isDirty,
  };
}
