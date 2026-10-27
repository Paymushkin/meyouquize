-- Pharma join form: optional job title on networking profile
ALTER TABLE "ParticipantProfile" ADD COLUMN "jobTitle" TEXT NOT NULL DEFAULT '';
