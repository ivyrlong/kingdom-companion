-- CreateEnum
CREATE TYPE "VocabularyTermType" AS ENUM ('WORD', 'PHRASE');

-- CreateTable
CREATE TABLE "VocabularyCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "type" "VocabularyTermType" NOT NULL,
    "ageAppropriate" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bibleRef" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenPackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTermCategory" (
    "termId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyTermCategory_pkey" PRIMARY KEY ("termId","categoryId")
);

-- CreateTable
CREATE TABLE "PackVocabularyLink" (
    "packId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackVocabularyLink_pkey" PRIMARY KEY ("packId","termId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCategory_slug_key" ON "VocabularyCategory"("slug");

-- CreateIndex
CREATE INDEX "VocabularyCategory_isActive_idx" ON "VocabularyCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyTerm_term_key" ON "VocabularyTerm"("term");

-- CreateIndex
CREATE INDEX "VocabularyTerm_type_idx" ON "VocabularyTerm"("type");

-- CreateIndex
CREATE INDEX "VocabularyTerm_useCount_idx" ON "VocabularyTerm"("useCount");

-- CreateIndex
CREATE INDEX "VocabularyTermCategory_categoryId_idx" ON "VocabularyTermCategory"("categoryId");

-- CreateIndex
CREATE INDEX "PackVocabularyLink_termId_idx" ON "PackVocabularyLink"("termId");

-- AddForeignKey
ALTER TABLE "VocabularyTerm" ADD CONSTRAINT "VocabularyTerm_firstSeenPackId_fkey" FOREIGN KEY ("firstSeenPackId") REFERENCES "ContentPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTermCategory" ADD CONSTRAINT "VocabularyTermCategory_termId_fkey" FOREIGN KEY ("termId") REFERENCES "VocabularyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTermCategory" ADD CONSTRAINT "VocabularyTermCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VocabularyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVocabularyLink" ADD CONSTRAINT "PackVocabularyLink_packId_fkey" FOREIGN KEY ("packId") REFERENCES "ContentPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVocabularyLink" ADD CONSTRAINT "PackVocabularyLink_termId_fkey" FOREIGN KEY ("termId") REFERENCES "VocabularyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
