-- AlterTable
ALTER TABLE "BestsellerDM" ADD COLUMN "canSendDm" BOOLEAN;

-- CreateIndex
CREATE INDEX "BestsellerDM_canSendDm_idx" ON "BestsellerDM"("canSendDm");
