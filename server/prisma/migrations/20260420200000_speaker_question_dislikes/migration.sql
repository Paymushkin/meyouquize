-- CreateTable
CREATE TABLE "SpeakerQuestionDislike" (
    "id" TEXT NOT NULL,
    "speakerQuestionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerQuestionDislike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerQuestionDislike_speakerQuestionId_participantId_key" ON "SpeakerQuestionDislike"("speakerQuestionId", "participantId");

-- CreateIndex
CREATE INDEX "SpeakerQuestionDislike_participantId_idx" ON "SpeakerQuestionDislike"("participantId");

-- AddForeignKey
ALTER TABLE "SpeakerQuestionDislike" ADD CONSTRAINT "SpeakerQuestionDislike_speakerQuestionId_fkey" FOREIGN KEY ("speakerQuestionId") REFERENCES "SpeakerQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerQuestionDislike" ADD CONSTRAINT "SpeakerQuestionDislike_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
