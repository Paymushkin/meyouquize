import { useMemo, useState } from "react";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import { sortRows, type SortKey, type SortState } from "./speakerQuestionsSort";

export function useSpeakerQuestionsTableState(rows: SpeakerQuestionItem[]) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Новые сверху; порядковый № при этом стабильный (1 = самый старый).
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "created", dir: "desc" });

  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  /** Стабильный № по времени поступления (1 = самый старый), не зависит от текущей сортировки. */
  const sequenceById = useMemo(() => {
    const chronological = [...rows].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    return new Map(chronological.map((row, index) => [row.id, index + 1]));
  }, [rows]);

  function getDraftValue(row: SpeakerQuestionItem): string {
    return drafts[row.id] ?? row.text;
  }

  function setDraftValue(id: string, value: string): void {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  }

  function canSaveDraft(row: SpeakerQuestionItem): boolean {
    const value = getDraftValue(row).trim();
    return value.length >= 3 && value !== row.text.trim();
  }

  function getTrimmedDraft(row: SpeakerQuestionItem): string {
    return getDraftValue(row).trim();
  }

  return {
    sort,
    setSort,
    sortedRows,
    sequenceById,
    getDraftValue,
    setDraftValue,
    canSaveDraft,
    getTrimmedDraft,
  };
}
