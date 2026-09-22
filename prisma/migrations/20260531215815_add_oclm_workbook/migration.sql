-- AlterTable
ALTER TABLE "ContentPack" ADD COLUMN     "bibleReadingAssignment" JSONB,
ADD COLUMN     "bibleReadingRange" JSONB,
ADD COLUMN     "publicationCode" TEXT,
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "songs" JSONB;
