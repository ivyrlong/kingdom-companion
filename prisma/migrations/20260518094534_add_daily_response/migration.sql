-- CreateTable
CREATE TABLE "DailyResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentPackId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyResponse_contentPackId_idx" ON "DailyResponse"("contentPackId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResponse_userId_contentPackId_questionIndex_key" ON "DailyResponse"("userId", "contentPackId", "questionIndex");

-- AddForeignKey
ALTER TABLE "DailyResponse" ADD CONSTRAINT "DailyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResponse" ADD CONSTRAINT "DailyResponse_contentPackId_fkey" FOREIGN KEY ("contentPackId") REFERENCES "ContentPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
