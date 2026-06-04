-- AlterTable
ALTER TABLE "BestsellerDM" ADD COLUMN "isWriteStackSubscriber" BOOLEAN;
ALTER TABLE "BestsellerDM" ADD COLUMN "writeStackCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BestsellerDM_isWriteStackSubscriber_idx" ON "BestsellerDM"("isWriteStackSubscriber");
