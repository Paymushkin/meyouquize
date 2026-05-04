-- CreateEnum
CREATE TYPE "QuestionFlowMode" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "SubQuiz"
ADD COLUMN "questionFlowMode" "QuestionFlowMode" NOT NULL DEFAULT 'MANUAL';
