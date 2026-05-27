-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEVER_SUBSCRIBED', 'CANCELED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userIdInWriteStack" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "substackHandle" TEXT,
    "status" "LeadStatus" NOT NULL,
    "lastPlanName" TEXT,
    "subscriptionCanceledAt" TIMESTAMP(3),
    "signedUpAt" TIMESTAMP(3),
    "firstEmailedAt" TIMESTAMP(3),
    "lastEmailedAt" TIMESTAMP(3),
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "remindAt" TIMESTAMP(3),
    "reminderDismissedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "excludedAt" TIMESTAMP(3),
    "excludedReason" TEXT,
    "notes" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyJson" JSONB NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "resendMessageId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "excludedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_userIdInWriteStack_key" ON "Lead"("userIdInWriteStack");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_status_lastEmailedAt_idx" ON "Lead"("status", "lastEmailedAt");

-- CreateIndex
CREATE INDEX "Lead_remindAt_idx" ON "Lead"("remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_resendMessageId_key" ON "EmailLog"("resendMessageId");

-- CreateIndex
CREATE INDEX "EmailLog_leadId_createdAt_idx" ON "EmailLog"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
