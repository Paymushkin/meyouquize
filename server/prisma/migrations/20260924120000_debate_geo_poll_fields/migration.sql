-- AlterTable
ALTER TABLE "Question" ADD COLUMN "debateBaselineQuestionId" TEXT;
ALTER TABLE "Question" ADD COLUMN "projectorDebateLayout" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_debateBaselineQuestionId_fkey" FOREIGN KEY ("debateBaselineQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
