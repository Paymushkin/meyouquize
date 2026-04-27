-- CreateEnum
CREATE TYPE "RankingKind" AS ENUM ('QUIZ', 'JURY');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "rankingKind" "RankingKind" NOT NULL DEFAULT 'QUIZ';
