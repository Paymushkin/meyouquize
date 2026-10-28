-- Networking join form: optional phone and email on profile
ALTER TABLE "ParticipantProfile" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParticipantProfile" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
