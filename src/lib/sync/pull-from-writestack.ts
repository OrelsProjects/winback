import { runInBatches } from "@/lib/batch";
import { prisma } from "@/lib/db/prisma";
import { LeadStatus } from "@/generated/enums";

const LEAD_UPSERT_BATCH_SIZE = 50;

type RemoteLead = {
  userIdInWriteStack: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  substackHandle: string | null;
  status: "CANCELED" | "NEVER_SUBSCRIBED";
  lastPlanName: string | null;
  subscriptionCanceledAt: string | null;
  signedUpAt: string | null;
  updatedAt: string;
  didUnsubscribeFromEmail?: boolean;
};

type PageResponse = {
  leads: RemoteLead[];
  nextCursor: string | null;
};

const fetchPage = async (cursor?: string): Promise<PageResponse> => {
  const url = new URL(process.env.WRITESTACK_LEADS_URL!);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", "3000");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${process.env.WRITESTACK_MTM_SECRET!}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`WriteStack responded ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<PageResponse>;
};

export const pullFromWritestack = async (syncRunId: string) => {
  const allLeads: RemoteLead[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchPage(cursor);
    allLeads.push(...page.leads);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  const remoteIds = new Set(allLeads.map((l) => l.userIdInWriteStack));
  const now = new Date();

  const upsertResults = await runInBatches(
    allLeads,
    LEAD_UPSERT_BATCH_SIZE,
    async (lead) => {
      const statusEnum =
        lead.status === "CANCELED"
          ? LeadStatus.CANCELED
          : LeadStatus.NEVER_SUBSCRIBED;
      const optedOutOfEmail = lead.didUnsubscribeFromEmail === true;

      const existing = await prisma.lead.findUnique({
        where: { userIdInWriteStack: lead.userIdInWriteStack },
        select: { id: true },
      });

      await prisma.lead.upsert({
        where: { userIdInWriteStack: lead.userIdInWriteStack },
        update: {
          email: lead.email,
          firstName: lead.firstName,
          lastName: lead.lastName,
          substackHandle: lead.substackHandle,
          status: statusEnum,
          lastPlanName: lead.lastPlanName,
          subscriptionCanceledAt: lead.subscriptionCanceledAt
            ? new Date(lead.subscriptionCanceledAt)
            : null,
          signedUpAt: lead.signedUpAt ? new Date(lead.signedUpAt) : null,
          lastSyncedAt: now,
          excludedAt: null,
          excludedReason: null,
          didUnsubscribeFromEmail: optedOutOfEmail,
          ...(optedOutOfEmail
            ? { remindAt: null, reminderDismissedAt: null }
            : {}),
        },
        create: {
          userIdInWriteStack: lead.userIdInWriteStack,
          email: lead.email,
          firstName: lead.firstName,
          lastName: lead.lastName,
          substackHandle: lead.substackHandle,
          status: statusEnum,
          lastPlanName: lead.lastPlanName,
          subscriptionCanceledAt: lead.subscriptionCanceledAt
            ? new Date(lead.subscriptionCanceledAt)
            : null,
          signedUpAt: lead.signedUpAt ? new Date(lead.signedUpAt) : null,
          lastSyncedAt: now,
          didUnsubscribeFromEmail: optedOutOfEmail,
          ...(optedOutOfEmail
            ? { remindAt: null, reminderDismissedAt: null }
            : {}),
        },
      });

      return { isUpdate: !!existing };
    },
    {
      printProgress: true,
      onError: (error, lead) => {
        console.error(`Error upserting lead ${lead.email}:`, error);
      },
    },
  );

  const addedCount = upsertResults?.filter((r) => !r.isUpdate).length ?? 0;
  const updatedCount = upsertResults?.filter((r) => r.isUpdate).length ?? 0;

  // Exclude leads no longer in the remote cohort
  const excluded = await prisma.lead.updateMany({
    where: {
      userIdInWriteStack: { notIn: [...remoteIds] },
      excludedAt: null,
    },
    data: {
      excludedAt: now,
      excludedReason: "no_longer_in_winback_cohort",
    },
  });

  await prisma.syncRun.update({
    where: { id: syncRunId },
    data: {
      finishedAt: now,
      addedCount,
      updatedCount,
      excludedCount: excluded.count,
    },
  });

  return { addedCount, updatedCount, excludedCount: excluded.count };
};
