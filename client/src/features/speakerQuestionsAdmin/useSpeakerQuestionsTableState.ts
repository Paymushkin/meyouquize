import { useMemo, useState } from "react";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import { sortRows, type SortKey, type SortState } from "./speakerQuestionsSort";

export function useSpeakerQuestionsTableState(rows: SpeakerQuestionItem[]) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "rating", dir: "desc" });

  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

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
    getDraftValue,
    setDraftValue,
    canSaveDraft,
    getTrimmedDraft,
  };
}
