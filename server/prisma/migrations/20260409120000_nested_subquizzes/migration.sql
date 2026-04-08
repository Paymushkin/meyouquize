-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('POLL', 'QUIZ');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "scoringMode" "ScoringMode" NOT NULL DEFAULT 'QUIZ';
ALTER TABLE "Question" ADD COLUMN "subQuizId" TEXT;

-- CreateTable
CREATE TABLE "SubQuiz" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Квиз',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubQuiz_quizId_idx" ON "SubQuiz"("quizId");

-- AddForeignKey
ALTER TABLE "SubQuiz" ADD CONSTRAINT "SubQuiz_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One default sub-quiz per existing room; preserve former Quiz.currentQuestionIndex
INSERT INTO "SubQuiz" ("id", "quizId", "title", "sortOrder", "currentQuestionIndex")
SELECT concat('sq_', "id"), "id", 'Квиз 1', 0, "currentQuestionIndex"
FROM "Quiz";

UPDATE "Question" q
SET "subQuizId" = concat('sq_', q."quizId")
FROM "Quiz" z
WHERE z."id" = q."quizId";

ALTER TABLE "Quiz" DROP COLUMN "currentQuestionIndex";

ALTER TABLE "Question" ADD CONSTRAINT "Question_subQuizId_fkey" FOREIGN KEY ("subQuizId") REFERENCES "SubQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
