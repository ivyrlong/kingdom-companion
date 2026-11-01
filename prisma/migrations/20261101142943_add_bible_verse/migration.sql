-- CreateTable
CREATE TABLE "BibleVerse" (
    "id" TEXT NOT NULL,
    "translation" TEXT NOT NULL DEFAULT 'NWT',
    "bookNumber" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BibleVerse_bookNumber_chapter_verse_idx" ON "BibleVerse"("bookNumber", "chapter", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "BibleVerse_translation_bookNumber_chapter_verse_key" ON "BibleVerse"("translation", "bookNumber", "chapter", "verse");
