-- Experiment: networking module (reversible — see migration.down.sql)

CREATE TABLE "ParticipantProfile" (
    "participantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "offers" TEXT NOT NULL DEFAULT '',
    "seeking" TEXT NOT NULL DEFAULT '',
    "visibleInDirectory" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("participantId")
);

CREATE TABLE "NetworkingThread" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkingThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NetworkingMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NetworkingMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NetworkingThread_quizId_participantAId_participantBId_key" ON "NetworkingThread"("quizId", "participantAId", "participantBId");
CREATE INDEX "NetworkingThread_quizId_idx" ON "NetworkingThread"("quizId");
CREATE INDEX "NetworkingThread_participantAId_idx" ON "NetworkingThread"("participantAId");
CREATE INDEX "NetworkingThread_participantBId_idx" ON "NetworkingThread"("participantBId");
CREATE INDEX "NetworkingMessage_threadId_createdAt_idx" ON "NetworkingMessage"("threadId", "createdAt");
CREATE INDEX "NetworkingMessage_senderId_idx" ON "NetworkingMessage"("senderId");

ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingThread" ADD CONSTRAINT "NetworkingThread_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingThread" ADD CONSTRAINT "NetworkingThread_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingMessage" ADD CONSTRAINT "NetworkingMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "NetworkingThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingMessage" ADD CONSTRAINT "NetworkingMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
