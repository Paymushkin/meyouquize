-- Per-question: show first correct nicknames on projector (standalone votes + global toggle)
ALTER TABLE "Question" ADD COLUMN "projectorShowFirstCorrect" BOOLEAN NOT NULL DEFAULT true;
