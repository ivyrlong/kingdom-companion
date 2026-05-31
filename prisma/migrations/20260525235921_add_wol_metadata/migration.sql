-- AlterTable
ALTER TABLE "ContentPack" ADD COLUMN     "articleNumber" INTEGER,
ADD COLUMN     "attribution" TEXT,
ADD COLUMN     "issueLabel" TEXT,
ADD COLUMN     "sourceDocId" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "themeScripture" JSONB;
