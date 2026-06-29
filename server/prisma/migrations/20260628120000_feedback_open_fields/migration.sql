-- AlterTable
ALTER TABLE "FeedbackForm" ADD COLUMN "openFields" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "FeedbackResponse" ADD COLUMN "openFieldAnswers" JSONB NOT NULL DEFAULT '{}';
