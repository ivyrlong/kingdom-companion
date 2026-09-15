-- CreateEnum
CREATE TYPE "StickerKind" AS ENUM ('PERSON', 'ANIMAL_PAIR', 'ANIMAL_SOLO', 'PLANT', 'HOME', 'SKY');

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "familyName" TEXT,
    "role" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "identityPrompt" TEXT NOT NULL,
    "portraitPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "StickerKind" NOT NULL,
    "path" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ageAppropriate" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "altText" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "characterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "moodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paletteAccent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");

-- CreateIndex
CREATE INDEX "Character_variant_role_idx" ON "Character"("variant", "role");

-- CreateIndex
CREATE INDEX "Character_familyName_idx" ON "Character"("familyName");

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_slug_key" ON "Sticker"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_characterId_key" ON "Sticker"("characterId");

-- CreateIndex
CREATE INDEX "Sticker_kind_idx" ON "Sticker"("kind");

-- CreateIndex
CREATE INDEX "Sticker_isActive_idx" ON "Sticker"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_slug_key" ON "Scene"("slug");

-- CreateIndex
CREATE INDEX "Scene_isActive_idx" ON "Scene"("isActive");

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
