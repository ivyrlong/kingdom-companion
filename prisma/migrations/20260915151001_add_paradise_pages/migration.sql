-- CreateTable
CREATE TABLE "ParadisePage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Paradise',
    "placements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParadisePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParadisePage_userId_idx" ON "ParadisePage"("userId");

-- CreateIndex
CREATE INDEX "ParadisePage_sceneId_idx" ON "ParadisePage"("sceneId");

-- AddForeignKey
ALTER TABLE "ParadisePage" ADD CONSTRAINT "ParadisePage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadisePage" ADD CONSTRAINT "ParadisePage_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
