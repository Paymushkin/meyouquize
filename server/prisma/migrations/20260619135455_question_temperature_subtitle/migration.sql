-- CreateIndex
CREATE INDEX "Question_subQuizId_idx" ON "Question"("subQuizId");

-- RenameIndex
ALTER INDEX "SpeakerQuestionReaction_speakerQuestionId_participantId_react_k" RENAME TO "SpeakerQuestionReaction_speakerQuestionId_participantId_rea_key";
