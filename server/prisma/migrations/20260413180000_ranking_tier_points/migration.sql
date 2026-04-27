-- CreateEnum
CREATE TYPE "RankingProjectorMetric" AS ENUM ('AVG_RANK', 'AVG_SCORE', 'TOTAL_SCORE');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "rankingPointsByRank" JSONB,
ADD COLUMN "rankingProjectorMetric" "RankingProjectorMetric" NOT NULL DEFAULT 'AVG_RANK';
