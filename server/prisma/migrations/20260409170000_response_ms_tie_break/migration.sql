-- Add activation timestamp for questions and response time metric for answers.
ALTER TABLE "Question"
ADD COLUMN "activatedAt" TIMESTAMP(3);

ALTER TABLE "Answer"
ADD COLUMN "responseMs" INTEGER NOT NULL DEFAULT 0;

-- Leaderboard tie-break support (score DESC, totalResponseMs ASC).
CREATE INDEX "Answer_quizId_participantId_responseMs_idx"
ON "Answer"("quizId", "participantId", "responseMs");
