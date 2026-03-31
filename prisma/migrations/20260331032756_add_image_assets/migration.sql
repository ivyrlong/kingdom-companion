-- CreateEnum
CREATE TYPE "ImageCategory" AS ENUM ('SCENE', 'CHARACTER', 'ILLUSTRATION', 'OUTLINE', 'PHOTO');

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "category" "ImageCategory" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'FAMILY',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "width" INTEGER,
    "height" INTEGER,
    "contentPackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageAsset_category_idx" ON "ImageAsset"("category");

-- CreateIndex
CREATE INDEX "ImageAsset_contentPackId_idx" ON "ImageAsset"("contentPackId");

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_contentPackId_fkey" FOREIGN KEY ("contentPackId") REFERENCES "ContentPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
