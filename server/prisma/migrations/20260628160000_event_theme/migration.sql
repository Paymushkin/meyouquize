-- CreateTable
CREATE TABLE "EventTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branding" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTheme_name_key" ON "EventTheme"("name");
