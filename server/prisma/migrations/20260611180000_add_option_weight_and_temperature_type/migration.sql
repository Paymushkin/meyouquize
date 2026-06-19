-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'TEMPERATURE';

-- AlterTable
ALTER TABLE "Option" ADD COLUMN "weight" INTEGER;
