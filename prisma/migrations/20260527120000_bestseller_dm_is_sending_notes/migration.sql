-- AlterTable
ALTER TABLE "BestsellerDM" ADD COLUMN "isSendingNotes" BOOLEAN;

-- CreateIndex
CREATE INDEX "BestsellerDM_isSendingNotes_idx" ON "BestsellerDM"("isSendingNotes");
