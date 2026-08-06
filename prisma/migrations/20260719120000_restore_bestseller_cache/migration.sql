-- Restore local Substack bestseller cache (dropped in 20260525200000).
CREATE TABLE "BestsellerCategory" (
    "categoryKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "emoji" TEXT,
    "substackCategoryId" INTEGER,
    "leaderboardDescription" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BestsellerCategory_pkey" PRIMARY KEY ("categoryKey")
);

CREATE TABLE "BestsellerEntry" (
    "id" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "publicationName" TEXT NOT NULL,
    "publicationUrl" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bestsellerTier" INTEGER,
    "authorId" INTEGER,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "authorPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BestsellerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BestsellerCategory_substackCategoryId_key" ON "BestsellerCategory"("substackCategoryId");

CREATE INDEX "BestsellerEntry_categoryKey_rank_idx" ON "BestsellerEntry"("categoryKey", "rank");

CREATE UNIQUE INDEX "BestsellerEntry_categoryKey_publicationId_key" ON "BestsellerEntry"("categoryKey", "publicationId");

ALTER TABLE "BestsellerEntry" ADD CONSTRAINT "BestsellerEntry_categoryKey_fkey" FOREIGN KEY ("categoryKey") REFERENCES "BestsellerCategory"("categoryKey") ON DELETE CASCADE ON UPDATE CASCADE;
