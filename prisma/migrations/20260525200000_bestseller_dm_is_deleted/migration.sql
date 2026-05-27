-- AlterTable
ALTER TABLE "BestsellerDM" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BestsellerDM_isDeleted_idx" ON "BestsellerDM"("isDeleted");
