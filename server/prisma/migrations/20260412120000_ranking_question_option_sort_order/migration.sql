-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'RANKING';

-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: стабильный порядок 0..n-1 по id внутри каждого вопроса
UPDATE "Option" o
SET "sortOrder" = s.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "questionId" ORDER BY id) AS rn
  FROM "Option"
) AS s
WHERE o.id = s.id;
