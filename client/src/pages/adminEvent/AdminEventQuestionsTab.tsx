import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import QuizIcon from "@mui/icons-material/Quiz";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect } from "react";
import {
  buildQuestionIndexMapForSubQuiz,
  type QuestionForm,
  type SubQuizSheet,
} from "../../admin/adminEventForm";
import { AdminFeedbackSection } from "../../components/admin/AdminFeedbackSection";
import { AdminQuestionsSection } from "../../components/admin/AdminQuestionsSection";
import { AdminRandomizerSection } from "../../components/admin/AdminRandomizerSection";
import { AdminReactionsSection } from "../../components/admin/AdminReactionsSection";
import { SubQuizControlsCard } from "../../components/admin/SubQuizControlsCard";
import type { AdminQuestionsSectionSharedBindings } from "../../features/admin/adminQuestionsSectionSharedBindings";
import type { RoomQuestionsTab } from "../../features/admin/adminUiPersistence";
import type { useAdminRandomizer } from "../../features/admin/useAdminRandomizer";
import type { useAdminReactions } from "../../features/admin/useAdminReactions";
import type { useAdminPlayerTiles } from "../../features/admin/useAdminPlayerTiles";
import type { AdminSetPublicResultsView } from "../../features/admin/useAdminRandomizer";
import {
  isStaleParticipantSnapshot,
  parseNames,
  randomizerNamesTextForPublicView,
} from "../../features/randomizer/randomizerLogic";
import type { PublicViewMode, PublicViewSetPatch } from "../../publicViewContract";
import { socket } from "../../socket";

export type AdminEventQuestionsTabProps = {
  roomQuestionsTab: RoomQuestionsTab;
  onRoomQuestionsTabChange: (
    value: "quizzes" | "votes" | "reactions" | "feedback" | "randomizer",
  ) => void;
  eventName: string;
  quizId: string;
  onlineUsersCount: number;
  eventParticipantNicknames: string[];
  refreshEventParticipantNicknames: () => Promise<string[]>;
  subQuizSheets: SubQuizSheet[];
  setSubQuizSheets: Dispatch<SetStateAction<SubQuizSheet[]>>;
  questionForms: QuestionForm[];
  selectedQuestionIndex: number;
  expandedSubQuizId: string | false;
  setExpandedSubQuizId: Dispatch<SetStateAction<string | false>>;
  votesIndexMap: number[];
  activeVoteIndices: number[];
  doneVoteIndices: number[];
  activeVotesSelectedListIndex: number;
  doneVotesSelectedListIndex: number;
  voteListManageMode: boolean;
  setVoteListManageMode: Dispatch<SetStateAction<boolean>>;
  publicViewMode: PublicViewMode;
  resultsSubQuizId: string;
  firstCorrectWinnersCount: number;
  setFirstCorrectWinnersCount: Dispatch<SetStateAction<number>>;
  highlightedLeadersCount: number;
  setHighlightedLeadersCount: Dispatch<SetStateAction<number>>;
  questionsSectionBindings: AdminQuestionsSectionSharedBindings;
  playerTiles: ReturnType<typeof useAdminPlayerTiles>;
  randomizer: ReturnType<typeof useAdminRandomizer>;
  adminReactions: ReturnType<typeof useAdminReactions>;
  emitPublicViewPatch: (patch: PublicViewSetPatch) => void;
  setPublicResultsView: AdminSetPublicResultsView;
  addSubQuizSheet: () => void;
  addQuestionToSubQuiz: (subQuizId: string | null) => void;
  saveSubQuizTitle: (
    subQuizId: string,
    title: string,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => void | Promise<void>;
  requestRemoveSubQuizSheet: (subQuizId: string) => void;
  toggleQuestion: (questionIndex: number, enabled: boolean) => void;
  updateFirstCorrectWinnersCount: (raw: number) => void;
  updateHighlightedLeaders: (nextValue: number) => void;
  confirmResetSubQuizAnswersById: (subQuizId: string, title: string) => void;
  toggleQuestionAdminDone: (globalIndex: number) => void | Promise<void>;
  reorderVoteInList: (
    fromLocal: number,
    toLocal: number,
    indexMap: number[],
  ) => void | Promise<void>;
  cloneQuestionAtIndex: (globalIndex: number) => void | Promise<void>;
};

export function AdminEventQuestionsTab({
  roomQuestionsTab,
  onRoomQuestionsTabChange,
  eventName,
  quizId,
  onlineUsersCount,
  eventParticipantNicknames,
  refreshEventParticipantNicknames,
  subQuizSheets,
  setSubQuizSheets,
  questionForms,
  selectedQuestionIndex,
  expandedSubQuizId,
  setExpandedSubQuizId,
  votesIndexMap,
  activeVoteIndices,
  doneVoteIndices,
  activeVotesSelectedListIndex,
  doneVotesSelectedListIndex,
  voteListManageMode,
  setVoteListManageMode,
  publicViewMode,
  resultsSubQuizId,
  firstCorrectWinnersCount,
  setFirstCorrectWinnersCount,
  highlightedLeadersCount,
  setHighlightedLeadersCount,
  questionsSectionBindings,
  playerTiles,
  randomizer,
  adminReactions,
  emitPublicViewPatch,
  setPublicResultsView,
  addSubQuizSheet,
  addQuestionToSubQuiz,
  saveSubQuizTitle,
  requestRemoveSubQuizSheet,
  toggleQuestion,
  updateFirstCorrectWinnersCount,
  updateHighlightedLeaders,
  confirmResetSubQuizAnswersById,
  toggleQuestionAdminDone,
  reorderVoteInList,
  cloneQuestionAtIndex,
}: AdminEventQuestionsTabProps) {
  const importParticipantsToFreeList = useCallback(
    (nicknames: string[]) => {
      if (nicknames.length === 0) return;
      const text = nicknames.join("\n");
      randomizer.markNamesEdited();
      randomizer.setNamesText(text);
      emitPublicViewPatch({ randomizerNamesText: text });
    },
    [emitPublicViewPatch, randomizer],
  );

  const refreshParticipantsFromRoom = useCallback(
    async (options?: { forceImportFreeList?: boolean }) => {
      const nicknames = await refreshEventParticipantNicknames();
      if (
        nicknames.length > 0 &&
        randomizer.listMode === "free_list" &&
        options?.forceImportFreeList
      ) {
        importParticipantsToFreeList(nicknames);
      }
      return nicknames;
    },
    [importParticipantsToFreeList, randomizer.listMode, refreshEventParticipantNicknames],
  );

  useEffect(() => {
    if (roomQuestionsTab !== "randomizer") return;
    void (async () => {
      const nicknames = await refreshEventParticipantNicknames();
      if (randomizer.listMode !== "free_list") return;
      if (randomizer.namesEditedRef.current) return;
      const saved = parseNames(randomizer.namesText);
      if (!isStaleParticipantSnapshot(saved, nicknames)) return;
      importParticipantsToFreeList(nicknames);
    })();
  }, [
    roomQuestionsTab,
    refreshEventParticipantNicknames,
    randomizer.listMode,
    randomizer.namesText,
    randomizer.namesEditedRef,
    importParticipantsToFreeList,
  ]);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Paper
        variant="outlined"
        elevation={0}
        sx={{
          p: 1.25,
          pt: 0,
          bgcolor: "background.paper",
          borderColor: "divider",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <Tabs
          value={roomQuestionsTab}
          onChange={(_, v: "quizzes" | "votes" | "reactions" | "feedback" | "randomizer") =>
            onRoomQuestionsTabChange(v)
          }
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: "divider", px: 0.5 }}
        >
          <Tab label="Квизы" value="quizzes" />
          <Tab label="Голосования" value="votes" />
          <Tab label="Реакции" value="reactions" />
          <Tab label="Обратная связь" value="feedback" />
          <Tab label="Рандомайзер" value="randomizer" />
        </Tabs>
        <Box sx={{ pt: 2, px: 0.25 }}>
          {roomQuestionsTab === "quizzes" &&
            (subQuizSheets.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                  py: 6,
                  px: 2,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                  onClick={addSubQuizSheet}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: "1.1rem",
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  Создать квиз
                </Button>
              </Box>
            ) : (
              <Stack sx={{ alignItems: "stretch" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0,
                    width: "100%",
                  }}
                >
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={addSubQuizSheet}
                  >
                    квиз
                  </Button>
                </Box>
                <Stack spacing={3} sx={{ width: "100%", mt: 1.5 }}>
                  {subQuizSheets.map((sq) => {
                    const quizIndexMap = buildQuestionIndexMapForSubQuiz(questionForms, sq.id);
                    const quizQuestions = quizIndexMap.map((i) => questionForms[i]).filter(Boolean);
                    const qSel = quizIndexMap.indexOf(selectedQuestionIndex);
                    const quizHasQuestions = quizIndexMap.length > 0;
                    const activeLocalIndex = quizQuestions.findIndex((q) => Boolean(q?.isActive));
                    const playerQuizReportActiveForThisSubQuiz =
                      playerTiles.playerQuizResultsSubQuizIds.includes(sq.id);
                    return (
                      <Accordion
                        key={sq.id}
                        disableGutters
                        expanded={expandedSubQuizId === sq.id}
                        onChange={(_, expanded) => setExpandedSubQuizId(expanded ? sq.id : false)}
                      >
                        <AccordionSummary
                          component="div"
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            pt: 2.5,
                            pb: 2,
                            "& .MuiAccordionSummary-content": {
                              alignItems: "center",
                              gap: 1,
                              flexGrow: 1,
                              marginTop: 0,
                              marginBottom: 0,
                              minWidth: 0,
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            <TextField
                              size="small"
                              label="Название квиза"
                              value={sq.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setSubQuizSheets((prev) =>
                                  prev.map((s) => (s.id === sq.id ? { ...s, title } : s)),
                                );
                              }}
                              onBlur={() => {
                                void saveSubQuizTitle(
                                  sq.id,
                                  sq.title,
                                  subQuizSheets,
                                  questionForms,
                                  quizId,
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              sx={{ flex: 1, maxWidth: 480, minWidth: 0 }}
                            />
                            <Tooltip title="Удалить квиз" enterTouchDelay={400}>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Удалить квиз"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.info("[admin][subquiz-delete] click", {
                                    subQuizId: sq.id,
                                  });
                                  requestRemoveSubQuizSheet(sq.id);
                                }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, px: 0, pb: 2 }}>
                          {quizHasQuestions ? (
                            <Stack spacing={1.25}>
                              <AdminQuestionsSection
                                {...questionsSectionBindings}
                                listTitle="Вопросы квиза"
                                listHeaderPrimaryAction={{
                                  label: "Статистика",
                                  to: `/admin/${eventName}/sub-quizzes/${sq.id}/results`,
                                }}
                                addButtonLabel="Вопрос"
                                questionForms={quizIndexMap.map((i) => questionForms[i])}
                                selectedListIndex={qSel < 0 ? 0 : qSel}
                                remapQuestionIndex={(local) => quizIndexMap[local] ?? 0}
                                addQuestion={() => addQuestionToSubQuiz(sq.id)}
                              />
                              <SubQuizControlsCard
                                activeLocalIndex={activeLocalIndex}
                                quizIndexMap={quizIndexMap}
                                quizId={quizId}
                                questionFlowMode={sq.questionFlowMode ?? "manual"}
                                onChangeQuestionFlowMode={(mode) =>
                                  setSubQuizSheets((prev) => {
                                    const current = prev.find((item) => item.id === sq.id);
                                    const next = prev.map((item) =>
                                      item.id === sq.id
                                        ? { ...item, questionFlowMode: mode }
                                        : item,
                                    );
                                    if (
                                      current?.questionFlowMode === "auto" &&
                                      mode === "manual" &&
                                      quizId
                                    ) {
                                      socket.emit("sub-quiz:close", {
                                        quizId,
                                        subQuizId: sq.id,
                                      });
                                    }
                                    return next;
                                  })
                                }
                                onStartAuto={() => {
                                  if (!quizId) return;
                                  socket.emit("sub-quiz:start-auto", {
                                    quizId,
                                    subQuizId: sq.id,
                                  });
                                }}
                                isLeaderboardShown={
                                  publicViewMode === "leaderboard" && resultsSubQuizId === sq.id
                                }
                                firstCorrectWinnersCount={firstCorrectWinnersCount}
                                highlightedLeadersCount={highlightedLeadersCount}
                                onPrev={() => {
                                  if (activeLocalIndex <= 0) return;
                                  const prevGlobalIndex = quizIndexMap[activeLocalIndex - 1];
                                  if (prevGlobalIndex == null) return;
                                  toggleQuestion(prevGlobalIndex, true);
                                }}
                                onNext={() => {
                                  if (activeLocalIndex < 0) {
                                    const firstGlobalIndex = quizIndexMap[0];
                                    if (firstGlobalIndex == null) return;
                                    toggleQuestion(firstGlobalIndex, true);
                                    return;
                                  }
                                  const nextGlobalIndex = quizIndexMap[activeLocalIndex + 1];
                                  if (nextGlobalIndex == null) {
                                    if (!quizId) return;
                                    socket.emit("sub-quiz:close", {
                                      quizId,
                                      subQuizId: sq.id,
                                    });
                                    return;
                                  }
                                  toggleQuestion(nextGlobalIndex, true);
                                }}
                                onFinish={() => {
                                  if (!quizId) return;
                                  socket.emit("sub-quiz:close", {
                                    quizId,
                                    subQuizId: sq.id,
                                  });
                                }}
                                onToggleResults={() => {
                                  if (
                                    publicViewMode === "leaderboard" &&
                                    resultsSubQuizId === sq.id
                                  ) {
                                    setPublicResultsView("title");
                                    return;
                                  }
                                  setPublicResultsView("leaderboard", undefined, {
                                    leaderboardSubQuizId: sq.id,
                                  });
                                }}
                                onChangeLeadersTop={(next) =>
                                  setFirstCorrectWinnersCount(Math.max(1, Math.min(20, next)))
                                }
                                onCommitLeadersTop={updateFirstCorrectWinnersCount}
                                onChangeResultsUsers={(next) => setHighlightedLeadersCount(next)}
                                onCommitResultsUsers={updateHighlightedLeaders}
                                playerQuizReportActive={playerQuizReportActiveForThisSubQuiz}
                                onTogglePlayerQuizReport={() => {
                                  if (!quizId) return;
                                  const active = playerTiles.playerQuizResultsSubQuizIds.includes(
                                    sq.id,
                                  );
                                  playerTiles.togglePlayerQuizReportForSubQuiz(
                                    sq.id,
                                    !active,
                                    sq.title.trim() || playerTiles.playerQuizResultsTileText,
                                  );
                                }}
                                onRequestResetAnswers={() =>
                                  confirmResetSubQuizAnswersById(sq.id, sq.title.trim() || "Квиз")
                                }
                              />
                            </Stack>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 200,
                                py: 4,
                                px: 2,
                              }}
                            >
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                                onClick={() => addQuestionToSubQuiz(sq.id)}
                                sx={{
                                  py: 2,
                                  px: 4,
                                  fontSize: "1.1rem",
                                  borderRadius: 2,
                                  boxShadow: 2,
                                  textTransform: "none",
                                }}
                              >
                                Вопрос
                              </Button>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
          {roomQuestionsTab === "votes" &&
            (votesIndexMap.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                  py: 6,
                  px: 2,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<HowToVoteIcon sx={{ fontSize: 28 }} />}
                  onClick={() => addQuestionToSubQuiz(null)}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: "1.1rem",
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  Создать голосование
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    flexShrink: 0,
                    width: "100%",
                  }}
                >
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => addQuestionToSubQuiz(null)}
                  >
                    Голосование
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {activeVoteIndices.length > 0 ? (
                    <AdminQuestionsSection
                      {...questionsSectionBindings}
                      listTitle={`Актуальные (${activeVoteIndices.length})`}
                      addButtonLabel="Добавить голосование"
                      listHeaderShowAddButton={false}
                      questionForms={activeVoteIndices.map((i) => questionForms[i])}
                      selectedListIndex={activeVotesSelectedListIndex}
                      remapQuestionIndex={(local) => activeVoteIndices[local] ?? 0}
                      adminDoneToggle={{
                        mode: "markDone",
                        onToggle: toggleQuestionAdminDone,
                      }}
                      voteListManageMode={voteListManageMode}
                      voteListManageToggle={{
                        enabled: voteListManageMode,
                        onToggle: () => setVoteListManageMode((current) => !current),
                      }}
                      onReorderVoteInList={(fromLocal, toLocal) =>
                        void reorderVoteInList(fromLocal, toLocal, activeVoteIndices)
                      }
                      addQuestion={() => addQuestionToSubQuiz(null)}
                      onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                      Нет актуальных голосований
                    </Typography>
                  )}
                  {doneVoteIndices.length > 0 ? (
                    <Accordion
                      defaultExpanded={false}
                      disableGutters
                      elevation={0}
                      sx={{
                        bgcolor: "transparent",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Отработанные ({doneVoteIndices.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <AdminQuestionsSection
                          {...questionsSectionBindings}
                          listTitle=""
                          addButtonLabel="Добавить голосование"
                          listHeaderShowAddButton={false}
                          questionForms={doneVoteIndices.map((i) => questionForms[i])}
                          selectedListIndex={doneVotesSelectedListIndex}
                          remapQuestionIndex={(local) => doneVoteIndices[local] ?? 0}
                          adminDoneToggle={{
                            mode: "markActive",
                            onToggle: toggleQuestionAdminDone,
                          }}
                          voteListManageMode={voteListManageMode}
                          onReorderVoteInList={(fromLocal, toLocal) =>
                            void reorderVoteInList(fromLocal, toLocal, doneVoteIndices)
                          }
                          addQuestion={() => addQuestionToSubQuiz(null)}
                          onCloneQuestion={(g) => void cloneQuestionAtIndex(g)}
                        />
                      </AccordionDetails>
                    </Accordion>
                  ) : null}
                </Stack>
              </Stack>
            ))}
          {roomQuestionsTab === "feedback" && quizId ? (
            <AdminFeedbackSection
              eventName={eventName}
              quizId={quizId}
              onlineUsersCount={onlineUsersCount}
            />
          ) : null}
          {roomQuestionsTab === "randomizer" && (
            <AdminRandomizerSection
              mode={randomizer.mode}
              listMode={randomizer.listMode}
              title={randomizer.title}
              namesText={randomizer.namesText}
              participantsNamesText={eventParticipantNicknames.join("\n")}
              liveParticipantCount={eventParticipantNicknames.length}
              onRefreshParticipants={() => {
                void refreshParticipantsFromRoom({ forceImportFreeList: true });
              }}
              onImportParticipantsToFreeList={() => {
                importParticipantsToFreeList(eventParticipantNicknames);
              }}
              minNumber={randomizer.minNumber}
              maxNumber={randomizer.maxNumber}
              winnersCount={randomizer.winnersCount}
              excludeWinners={randomizer.excludeWinners}
              currentWinners={randomizer.currentWinners}
              history={randomizer.history}
              projectorMode={publicViewMode === "randomizer"}
              isRunning={randomizer.isRunning}
              onModeChange={(next) => {
                randomizer.setMode(next);
                emitPublicViewPatch({ randomizerMode: next });
              }}
              onListModeChange={(next) => {
                if (next === "participants_only") {
                  void refreshEventParticipantNicknames();
                }
                randomizer.setListMode(next);
                if (next === "free_list" && eventParticipantNicknames.length > 0) {
                  const text = eventParticipantNicknames.join("\n");
                  randomizer.markNamesEdited();
                  randomizer.setNamesText(text);
                  emitPublicViewPatch({ randomizerListMode: next, randomizerNamesText: text });
                  return;
                }
                emitPublicViewPatch({
                  randomizerListMode: next,
                  randomizerNamesText: randomizerNamesTextForPublicView(
                    next,
                    next === "free_list" ? randomizer.namesText : "",
                  ),
                });
              }}
              onTitleChange={(next) => {
                randomizer.setTitle(next);
              }}
              onTitleCommit={() => {
                emitPublicViewPatch({ randomizerTitle: randomizer.title });
              }}
              onNamesTextChange={(next) => {
                randomizer.markNamesEdited();
                randomizer.setNamesText(next);
                if (randomizer.listMode === "free_list") {
                  emitPublicViewPatch({ randomizerNamesText: next });
                }
              }}
              onMinNumberChange={(next) => {
                randomizer.setMinNumber(Math.trunc(next || 0));
                emitPublicViewPatch({ randomizerMinNumber: Math.trunc(next || 0) });
              }}
              onMaxNumberChange={(next) => {
                randomizer.setMaxNumber(Math.trunc(next || 0));
                emitPublicViewPatch({ randomizerMaxNumber: Math.trunc(next || 0) });
              }}
              onWinnersCountChange={(next) => {
                const clamped = Math.max(1, Math.trunc(next || 1));
                randomizer.setWinnersCount(clamped);
                emitPublicViewPatch({ randomizerWinnersCount: clamped });
              }}
              onExcludeWinnersChange={(next) => {
                randomizer.setExcludeWinners(next);
                emitPublicViewPatch({ randomizerExcludeWinners: next });
              }}
              onRun={randomizer.runRandomizer}
              onReset={randomizer.resetRandomizer}
              onClearScreen={randomizer.clearRandomizerScreenData}
              onToggleProjector={() => {
                if (publicViewMode === "randomizer") {
                  setPublicResultsView("title");
                  return;
                }
                setPublicResultsView("randomizer");
              }}
            />
          )}
          {roomQuestionsTab === "reactions" && (
            <AdminReactionsSection
              widgets={adminReactions.widgets}
              session={adminReactions.reactionSession}
              widgetStatsById={adminReactions.widgetStatsById}
              activeWidgetId={adminReactions.activeWidgetId}
              projectorWidgetId={adminReactions.projectorWidgetId}
              projectorMode={publicViewMode === "reactions"}
              overlayText={adminReactions.overlayText}
              setOverlayText={adminReactions.setOverlayText}
              onCreateWidget={adminReactions.createWidget}
              onUpdateWidget={adminReactions.updateWidget}
              onDeleteWidget={adminReactions.deleteWidget}
              onStartWidget={adminReactions.startWidget}
              onStop={adminReactions.stopWidget}
              onToggleProjector={adminReactions.toggleProjector}
            />
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
