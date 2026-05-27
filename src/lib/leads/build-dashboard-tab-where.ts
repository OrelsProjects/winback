import type { LeadStatus } from "@/generated/browser";
import type { Prisma } from "@/generated/client";
import { OUTREACH_TAB_BASE } from "@/lib/constants";

export type DashboardListParams = {
  tab: string;
  q: string;
  now: Date;
};

/**
 * Matches the “Leads” table filters in `src/app/(admin)/page.tsx`.
 */
export const buildDashboardTabWhere = ({
  tab,
  q,
  now,
}: DashboardListParams): Prisma.LeadWhereInput => {
  const baseWhere: Prisma.LeadWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { substackHandle: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  switch (tab) {
    case "canceled":
      return { ...baseWhere, status: "CANCELED" as LeadStatus, ...OUTREACH_TAB_BASE };
    case "never":
      return { ...baseWhere, status: "NEVER_SUBSCRIBED" as LeadStatus, ...OUTREACH_TAB_BASE };
    case "not-emailed":
      return { ...baseWhere, emailCount: 0, ...OUTREACH_TAB_BASE };
    case "reminders":
      return {
        ...baseWhere,
        remindAt: { lte: now },
        reminderDismissedAt: null,
        ...OUTREACH_TAB_BASE,
      };
    case "excluded":
      return {
        ...baseWhere,
        OR: [
          { excludedAt: { not: null } },
          { unsubscribedAt: { not: null } },
          { didUnsubscribeFromEmail: true },
        ],
      };
    default:
      return { ...baseWhere, ...OUTREACH_TAB_BASE };
  }
};

const SORT_FIELDS = ["createdAt", "subscriptionCanceledAt", "lastEmailedAt", "emailCount"] as const;

export type DashboardSortField = (typeof SORT_FIELDS)[number];

export const normalizeDashboardSort = (sort: string): DashboardSortField =>
  SORT_FIELDS.includes(sort as DashboardSortField) ? (sort as DashboardSortField) : "createdAt";
