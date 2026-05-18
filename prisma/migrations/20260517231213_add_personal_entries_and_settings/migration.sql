-- CreateEnum
CREATE TYPE "EncyclopediaMode" AS ENUM ('PLAYFUL', 'STUDY');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "encyclopediaMode" "EncyclopediaMode" NOT NULL DEFAULT 'PLAYFUL',
ADD COLUMN     "receiveCuratedFindings" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PersonalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "category" "EncyclopediaCategory" NOT NULL DEFAULT 'THINGS',
    "bibleRef" TEXT,
    "note" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalEntry_userId_idx" ON "PersonalEntry"("userId");

-- AddForeignKey
ALTER TABLE "PersonalEntry" ADD CONSTRAINT "PersonalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
