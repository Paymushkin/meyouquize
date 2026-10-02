-- AlterTable
ALTER TABLE "SpeakerQuestion" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "SpeakerQuestion_quizId_sessionId_idx" ON "SpeakerQuestion"("quizId", "sessionId");
