import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

export type SortKey =
  | "created"
  | "author"
  | "speaker"
  | "rating"
  | "question"
  | "ui"
  | "screen"
  | "action";
export type SortState<T extends SortKey> = { key: T; dir: "asc" | "desc" };

export function nextDir(active: boolean, dir: "asc" | "desc"): "asc" | "desc" {
  if (!active) return "asc";
  return dir === "asc" ? "desc" : "asc";
}

function ratingValue(row: SpeakerQuestionItem): number {
  const reactionTotal = Object.values(row.reactionCounts ?? {}).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (reactionTotal > 0) return reactionTotal;
  return row.likeCount - row.dislikeCount;
}

export function compareRows(
  a: SpeakerQuestionItem,
  b: SpeakerQuestionItem,
  key: SortKey,
  dir: "asc" | "desc",
): number {
  const mul = dir === "asc" ? 1 : -1;
  if (key === "author") return mul * a.authorNickname.localeCompare(b.authorNickname, "ru");
  if (key === "created") return mul * a.createdAt.localeCompare(b.createdAt);
  if (key === "speaker") return mul * a.speakerName.localeCompare(b.speakerName, "ru");
  if (key === "question") return mul * a.text.localeCompare(b.text, "ru");
  if (key === "ui") return mul * ((a.userVisible ? 1 : 0) - (b.userVisible ? 1 : 0));
  if (key === "screen") return mul * ((a.isOnScreen ? 1 : 0) - (b.isOnScreen ? 1 : 0));
  if (key === "action") return mul * a.id.localeCompare(b.id);
  const scoreA = ratingValue(a);
  const scoreB = ratingValue(b);
  if (scoreA !== scoreB) return mul * (scoreA - scoreB);
  const reactionA = Object.values(a.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0);
  const reactionB = Object.values(b.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0);
  if (reactionA !== reactionB) return mul * (reactionA - reactionB);
  return mul * a.createdAt.localeCompare(b.createdAt);
}

export function sortRows<T extends SortKey>(
  rows: SpeakerQuestionItem[],
  sort: SortState<T>,
): SpeakerQuestionItem[] {
  return [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.dir));
}
