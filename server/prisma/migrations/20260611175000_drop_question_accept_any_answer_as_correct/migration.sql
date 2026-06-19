-- Колонка не используется в приложении; убираем дрейф схемы.
ALTER TABLE "Question" DROP COLUMN IF EXISTS "acceptAnyAnswerAsCorrect";
