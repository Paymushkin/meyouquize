-- AlterTable
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "debateSeriesId" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "debateRoundIndex" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Question_debateSeriesId_idx" ON "Question"("debateSeriesId");
