-- CreateTable
CREATE TABLE "SpeakerQuestionReaction" (
    "id" TEXT NOT NULL,
    "speakerQuestionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerQuestionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerQuestionReaction_speakerQuestionId_participantId_react_key" ON "SpeakerQuestionReaction"("speakerQuestionId", "participantId", "reaction");

-- CreateIndex
CREATE INDEX "SpeakerQuestionReaction_speakerQuestionId_idx" ON "SpeakerQuestionReaction"("speakerQuestionId");

-- CreateIndex
CREATE INDEX "SpeakerQuestionReaction_participantId_idx" ON "SpeakerQuestionReaction"("participantId");

-- AddForeignKey
ALTER TABLE "SpeakerQuestionReaction" ADD CONSTRAINT "SpeakerQuestionReaction_speakerQuestionId_fkey" FOREIGN KEY ("speakerQuestionId") REFERENCES "SpeakerQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerQuestionReaction" ADD CONSTRAINT "SpeakerQuestionReaction_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
