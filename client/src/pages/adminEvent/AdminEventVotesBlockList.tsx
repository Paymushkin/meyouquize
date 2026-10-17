import type { Dispatch, DragEvent, SetStateAction } from "react";
import { Paper, Stack } from "@mui/material";
import {
  buildVotesDisplayBlocks,
  filterVotesDisplayBlocks,
  type QuestionForm,
} from "../../admin/adminEventForm";
import { AdminQuestionsSection } from "../../components/admin/AdminQuestionsSection";
import type { AdminQuestionsSectionSharedBindings } from "../../features/admin/adminQuestionsSectionSharedBindings";
import type { AdminSetPublicResultsView } from "../../features/admin/useAdminRandomizer";
import type { PublicViewMode } from "../../publicViewContract";
import { DebateSeriesBlockShell } from "./AdminEventDebateSeriesBlocks";

export type VotesBlockScope = "active" | "done";

export type VotesBlockDragState = {
  scope: VotesBlockScope;
  index: number;
} | null;

export type AdminEventVotesBlockListProps = {
  scope: VotesBlockScope;
  memberIndices: number[];
  selectedListIndex: number;
  questionForms: QuestionForm[];
  questionsSectionBindings: AdminQuestionsSectionSharedBindings;
  publicViewMode: PublicViewMode;
  setPublicResultsView: AdminSetPublicResultsView;
  voteListManageMode: boolean;
  votesBlockDrag: VotesBlockDragState;
  votesBlockDrop: VotesBlockDragState;
  setVotesBlockDrag: Dispatch<SetStateAction<VotesBlockDragState>>;
  setVotesBlockDrop: Dispatch<SetStateAction<VotesBlockDragState>>;
  reorderVoteDisplayBlocks: (
    fromBlockIndex: number,
    toBlockIndex: number,
    scopeIndices: number[],
  ) => void | Promise<void>;
  reorderVoteInList: (
    fromLocal: number,
    toLocal: number,
    indexMap: number[],
  ) => void | Promise<void>;
  addQuestionToSubQuiz: (subQuizId: string | null) => void;
  cloneQuestionAtIndex: (globalIndex: number) => void | Promise<void>;
  toggleQuestionAdminDone: (globalIndex: number) => void | Promise<void>;
  setQuestionsAdminDone: (globalIndices: number[], adminDone: boolean) => void | Promise<void>;
  cloneDebateSeries: (seriesId: string) => void | Promise<void>;
  addDebateSeriesRoundAtIndex: (globalIndex: number) => void | Promise<void>;
  updateDebateSeries: (
    seriesId: string,
    patch: {
      resultTitle: string;
      options: Array<{ text: string; color?: string | null; isCorrect?: boolean }>;
      rounds: Array<{ formIndex: number; text: string }>;
    },
  ) => void | Promise<void>;
  removeDebateSeries: (seriesId: string) => void | Promise<void>;
  removeQuestion: (index: number) => void | Promise<void>;
  debateSeriesShowRounds: boolean;
  onToggleDebateSeriesShowRounds: () => void;
};

export function AdminEventVotesBlockList({
  scope,
  memberIndices,
  selectedListIndex,
  questionForms,
  questionsSectionBindings,
  publicViewMode,
  setPublicResultsView,
  voteListManageMode,
  votesBlockDrag,
  votesBlockDrop,
  setVotesBlockDrag,
  setVotesBlockDrop,
  reorderVoteDisplayBlocks,
  reorderVoteInList,
  addQuestionToSubQuiz,
  cloneQuestionAtIndex,
  toggleQuestionAdminDone,
  setQuestionsAdminDone,
  cloneDebateSeries,
  addDebateSeriesRoundAtIndex,
  updateDebateSeries,
  removeDebateSeries,
  removeQuestion,
  debateSeriesShowRounds,
  onToggleDebateSeriesShowRounds,
}: AdminEventVotesBlockListProps) {
  const adminDoneMode = scope === "active" ? "markDone" : "markActive";
  const keyPrefix = scope === "active" ? "" : "done-";

  return (
    <Stack spacing={1.5}>
      {filterVotesDisplayBlocks(buildVotesDisplayBlocks(questionForms), new Set(memberIndices)).map(
        (block, blockIndex) => {
          const indices = block.kind === "debate_series" ? block.formIndices : [block.formIndex];
          const selectedLocal = indices.indexOf(memberIndices[selectedListIndex] ?? -1);
          const isDropTarget =
            voteListManageMode &&
            votesBlockDrop?.scope === scope &&
            votesBlockDrop.index === blockIndex &&
            votesBlockDrag?.scope === scope &&
            votesBlockDrag.index !== blockIndex;
          const blockDropSx = {
            outline: isDropTarget ? "2px solid" : undefined,
            outlineColor: isDropTarget ? "primary.main" : undefined,
            opacity:
              voteListManageMode &&
              votesBlockDrag?.scope === scope &&
              votesBlockDrag.index === blockIndex
                ? 0.55
                : 1,
          } as const;
          const blockDragHandlers = voteListManageMode
            ? {
                onDragOver: (event: DragEvent) => {
                  if (votesBlockDrag?.scope !== scope) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setVotesBlockDrop({ scope, index: blockIndex });
                },
                onDragLeave: () => {
                  setVotesBlockDrop((current) =>
                    current?.scope === scope && current.index === blockIndex ? null : current,
                  );
                },
                onDrop: (event: DragEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (votesBlockDrag?.scope === scope && votesBlockDrag.index !== blockIndex) {
                    void reorderVoteDisplayBlocks(votesBlockDrag.index, blockIndex, memberIndices);
                  }
                  setVotesBlockDrag(null);
                  setVotesBlockDrop(null);
                },
              }
            : {};
          const hostBlockDragProps =
            voteListManageMode && block.kind === "single"
              ? {
                  onHostBlockDragStart: () => {
                    setVotesBlockDrag({ scope, index: blockIndex });
                    setVotesBlockDrop(null);
                  },
                  onHostBlockDragEnd: () => {
                    setVotesBlockDrag(null);
                    setVotesBlockDrop(null);
                  },
                }
              : {};

          return block.kind === "debate_series" ? (
            <DebateSeriesBlockShell
              key={`${keyPrefix}series-${block.seriesId}`}
              seriesId={block.seriesId}
              formIndices={indices}
              questionForms={questionForms}
              questionResults={questionsSectionBindings.questionResults}
              publicViewMode={publicViewMode}
              publicViewQuestionId={questionsSectionBindings.publicViewQuestionId}
              playerResultsVisible={questionsSectionBindings.playerVisibleDebateSeriesIds.includes(
                block.seriesId,
              )}
              onTogglePlayerResults={() =>
                questionsSectionBindings.togglePlayerVisibleDebateSeriesId(block.seriesId)
              }
              debateSeriesShowRounds={debateSeriesShowRounds}
              onToggleDebateSeriesShowRounds={onToggleDebateSeriesShowRounds}
              setMessage={questionsSectionBindings.setMessage}
              setPublicResultsView={setPublicResultsView}
              onAddRound={(g) => void addDebateSeriesRoundAtIndex(g)}
              onCloneSeries={(id) => void cloneDebateSeries(id)}
              onSaveSeries={(id, payload) => void updateDebateSeries(id, payload)}
              onRemoveSeries={(id) => void removeDebateSeries(id)}
              onRemoveRound={(formIndex) => void removeQuestion(formIndex)}
              manageMode={voteListManageMode}
              adminDoneMode={adminDoneMode}
              onToggleAdminDone={() => void setQuestionsAdminDone(indices, scope === "active")}
              onBlockDragStart={() => {
                setVotesBlockDrag({ scope, index: blockIndex });
                setVotesBlockDrop(null);
              }}
              onBlockDragEnd={() => {
                setVotesBlockDrag(null);
                setVotesBlockDrop(null);
              }}
              onDragOver={blockDragHandlers.onDragOver}
              onDragLeave={blockDragHandlers.onDragLeave}
              onDrop={blockDragHandlers.onDrop}
              paperSx={{
                bgcolor: "background.paper",
                ...blockDropSx,
              }}
            >
              <AdminQuestionsSection
                {...questionsSectionBindings}
                listTitle=""
                addButtonLabel="Добавить голосование"
                listHeaderShowAddButton={false}
                questionForms={indices.map((i) => questionForms[i]!)}
                selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                remapQuestionIndex={(local) => indices[local] ?? 0}
                voteListManageMode={voteListManageMode}
                onReorderVoteInList={(fromLocal, toLocal) =>
                  void reorderVoteInList(fromLocal, toLocal, indices)
                }
                addQuestion={() => addQuestionToSubQuiz(null)}
                onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
              />
            </DebateSeriesBlockShell>
          ) : (
            <Paper
              key={`${keyPrefix}single-${block.formIndex}`}
              variant="outlined"
              sx={{
                borderColor: "divider",
                bgcolor: "background.paper",
                ...blockDropSx,
              }}
              onDragOver={blockDragHandlers.onDragOver}
              onDragLeave={blockDragHandlers.onDragLeave}
              onDrop={blockDragHandlers.onDrop}
            >
              <AdminQuestionsSection
                {...questionsSectionBindings}
                listTitle=""
                addButtonLabel="Добавить голосование"
                listHeaderShowAddButton={false}
                questionForms={indices.map((i) => questionForms[i]!)}
                selectedListIndex={selectedLocal >= 0 ? selectedLocal : 0}
                remapQuestionIndex={(local) => indices[local] ?? 0}
                adminDoneToggle={{
                  mode: adminDoneMode,
                  onToggle: toggleQuestionAdminDone,
                }}
                voteListManageMode={voteListManageMode}
                onReorderVoteInList={(fromLocal, toLocal) =>
                  void reorderVoteInList(fromLocal, toLocal, indices)
                }
                {...hostBlockDragProps}
                addQuestion={() => addQuestionToSubQuiz(null)}
                onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
              />
            </Paper>
          );
        },
      )}
    </Stack>
  );
}
