-- CreateEnum
CREATE TYPE "EncyclopediaCategory" AS ENUM ('PEOPLE', 'PLACES', 'THINGS', 'EVENTS');

-- CreateTable
CREATE TABLE "EncyclopediaEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "imageUrl" TEXT,
    "bibleRef" TEXT,
    "category" "EncyclopediaCategory" NOT NULL DEFAULT 'THINGS',
    "triggers" JSONB NOT NULL DEFAULT '[]',
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'LITTLE_ONES',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncyclopediaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEncyclopediaCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "UserEncyclopediaCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncyclopediaEntry_slug_key" ON "EncyclopediaEntry"("slug");

-- CreateIndex
CREATE INDEX "EncyclopediaEntry_ageGroup_idx" ON "EncyclopediaEntry"("ageGroup");

-- CreateIndex
CREATE INDEX "EncyclopediaEntry_isActive_idx" ON "EncyclopediaEntry"("isActive");

-- CreateIndex
CREATE INDEX "UserEncyclopediaCollection_userId_idx" ON "UserEncyclopediaCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEncyclopediaCollection_userId_entryId_key" ON "UserEncyclopediaCollection"("userId", "entryId");

-- AddForeignKey
ALTER TABLE "UserEncyclopediaCollection" ADD CONSTRAINT "UserEncyclopediaCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEncyclopediaCollection" ADD CONSTRAINT "UserEncyclopediaCollection_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EncyclopediaEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
