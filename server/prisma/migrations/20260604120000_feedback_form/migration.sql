-- CreateTable
CREATE TABLE "FeedbackForm" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Обратная связь',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "scales" JSONB NOT NULL,
    "commentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentPlaceholder" TEXT NOT NULL DEFAULT '',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL,
    "feedbackFormId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "scaleAnswers" JSONB NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackForm_quizId_key" ON "FeedbackForm"("quizId");

-- CreateIndex
CREATE INDEX "FeedbackForm_quizId_idx" ON "FeedbackForm"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_feedbackFormId_participantId_key" ON "FeedbackResponse"("feedbackFormId", "participantId");

-- CreateIndex
CREATE INDEX "FeedbackResponse_feedbackFormId_idx" ON "FeedbackResponse"("feedbackFormId");

-- CreateIndex
CREATE INDEX "FeedbackResponse_participantId_idx" ON "FeedbackResponse"("participantId");

-- AddForeignKey
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_feedbackFormId_fkey" FOREIGN KEY ("feedbackFormId") REFERENCES "FeedbackForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
