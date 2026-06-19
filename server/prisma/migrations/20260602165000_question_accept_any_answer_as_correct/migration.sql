-- Allow quiz questions to grant points for any selected option.
ALTER TABLE "Question"
ADD COLUMN "acceptAnyAnswerAsCorrect" BOOLEAN NOT NULL DEFAULT false;
