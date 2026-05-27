import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { LeadList } from "@/components/leads/lead-list";
import { RemindersSection } from "@/components/leads/reminders-section";
import { LeadFilters } from "@/components/leads/lead-filters";
import { DailyCapPill } from "@/components/leads/daily-cap-pill";
import { SyncButton } from "@/components/leads/sync-button";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfUtcDay } from "@/lib/time";
import { OUTREACH_TAB_BASE } from "@/lib/constants";
import { buildDashboardTabWhere, normalizeDashboardSort } from "@/lib/leads/build-dashboard-tab-where";
import { CompleteCapButton } from "@/components/leads/complete-cap-button";

type SearchParams = {
  tab?: string;
  sort?: string;
  dir?: string;
  q?: string;
  page?: string;
};

const PAGE_SIZE = 50;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "all";
  const sort = params.sort ?? "createdAt";
  const dir = (params.dir ?? "desc") as "asc" | "desc";
  const q = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? 1));

  const now = new Date();

  const tabWhere = buildDashboardTabWhere({ tab, q, now });

  const orderBy = { [normalizeDashboardSort(sort)]: dir } as Record<string, "asc" | "desc">;

  const [leads, total, reminderLeads, emailsSentToday] = await Promise.all([
    prisma.lead.findMany({
      where: tabWhere,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { emails: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.lead.count({ where: tabWhere }),
    prisma.lead.findMany({
      where: {
        remindAt: { lte: now },
        reminderDismissedAt: null,
        ...OUTREACH_TAB_BASE,
      },
      orderBy: { remindAt: "asc" },
      take: 20,
      include: { emails: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.emailLog.count({
      where: { sentAt: { gte: startOfUtcDay() } },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const dailyCap = Number(process.env.DAILY_SEND_CAP ?? 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} leads</p>
        </div>
        <div className="flex items-center gap-3">
          <DailyCapPill sent={emailsSentToday} cap={dailyCap} />
          <CompleteCapButton
            tab={tab}
            sort={sort}
            dir={dir}
            q={q}
            emailsSentToday={emailsSentToday}
            dailyCap={dailyCap}
          />
          <SyncButton />
        </div>
      </div>

      {tab !== "excluded" && tab !== "reminders" && reminderLeads.length > 0 && (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <RemindersSection leads={reminderLeads} />
        </Suspense>
      )}

      <LeadFilters />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LeadList
          key={`${tab}-${page}-${q}-${normalizeDashboardSort(sort)}-${dir}`}
          leads={leads}
          total={total}
          page={page}
          totalPages={totalPages}
          emailsSentToday={emailsSentToday}
          dailyCap={dailyCap}
        />
      </Suspense>
    </div>
  );
}
