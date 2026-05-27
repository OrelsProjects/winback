-- AlterTable
ALTER TABLE "BestsellerDM" ADD COLUMN "eligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BestsellerDM" ADD COLUMN "eligibleCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BestsellerDM_eligible_idx" ON "BestsellerDM"("eligible");
