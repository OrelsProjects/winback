"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { startOfUtcDay } from "@/lib/time";
import {
  buildDashboardTabWhere,
  normalizeDashboardSort,
} from "@/lib/leads/build-dashboard-tab-where";

const MAX_BULK_LEADS = 500;

export type GetLeadIdsForBulkSendInput = {
  tab: string;
  sort: string;
  dir: "asc" | "desc";
  q: string;
};

export const getLeadIdsForBulkSend = async (
  input: GetLeadIdsForBulkSendInput,
): Promise<
  | { ok: true; leadIds: string[] }
  | { ok: false; error: string }
> => {
  const session = await getSession();
  if (!session.isLoggedIn) return { ok: false, error: "Unauthorized" };

  if (input.tab === "excluded") {
    return { ok: false, error: "Not available on the Excluded tab" };
  }

  const dailyCap = Number(process.env.DAILY_SEND_CAP ?? 100);
  const sentToday = await prisma.emailLog.count({
    where: { sentAt: { gte: startOfUtcDay() } },
  });
  const remaining = dailyCap - sentToday;
  if (remaining <= 0) {
    return { ok: false, error: "Daily cap already reached" };
  }

  const now = new Date();
  const where = buildDashboardTabWhere({ tab: input.tab, q: input.q, now });
  const sortField = normalizeDashboardSort(input.sort);
  const orderBy = { [sortField]: input.dir } as Record<string, "asc" | "desc">;

  const take = Math.min(remaining, MAX_BULK_LEADS);

  const leads = await prisma.lead.findMany({
    where,
    orderBy,
    take,
    select: { id: true },
  });

  return { ok: true, leadIds: leads.map((l) => l.id) };
};
