-- CreateTable
CREATE TABLE "BestsellerDM" (
    "id" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "handle" TEXT,
    "name" TEXT,
    "threadId" TEXT,
    "wasSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "lastReplyAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BestsellerDM_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BestsellerDM_authorId_key" ON "BestsellerDM"("authorId");

-- CreateIndex
CREATE INDEX "BestsellerDM_wasSent_sentAt_idx" ON "BestsellerDM"("wasSent", "sentAt");
