-- AlterTable
ALTER TABLE "SpeakerQuestion"
ADD COLUMN "isVisibleToModerator" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: ранее на /s попадали APPROVED
UPDATE "SpeakerQuestion"
SET "isVisibleToModerator" = true
WHERE "status" = 'APPROVED';
