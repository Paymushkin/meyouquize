-- CreateEnum
CREATE TYPE "SpeakerQuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SpeakerQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "speakerName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "SpeakerQuestionStatus" NOT NULL DEFAULT 'PENDING',
    "isOnScreen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerQuestionLike" (
    "id" TEXT NOT NULL,
    "speakerQuestionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerQuestionLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeakerQuestion_quizId_createdAt_idx" ON "SpeakerQuestion"("quizId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakerQuestion_quizId_status_createdAt_idx" ON "SpeakerQuestion"("quizId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakerQuestion_quizId_isOnScreen_createdAt_idx" ON "SpeakerQuestion"("quizId", "isOnScreen", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerQuestionLike_speakerQuestionId_participantId_key" ON "SpeakerQuestionLike"("speakerQuestionId", "participantId");

-- CreateIndex
CREATE INDEX "SpeakerQuestionLike_participantId_idx" ON "SpeakerQuestionLike"("participantId");

-- AddForeignKey
ALTER TABLE "SpeakerQuestion" ADD CONSTRAINT "SpeakerQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerQuestion" ADD CONSTRAINT "SpeakerQuestion_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerQuestionLike" ADD CONSTRAINT "SpeakerQuestionLike_speakerQuestionId_fkey" FOREIGN KEY ("speakerQuestionId") REFERENCES "SpeakerQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerQuestionLike" ADD CONSTRAINT "SpeakerQuestionLike_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
