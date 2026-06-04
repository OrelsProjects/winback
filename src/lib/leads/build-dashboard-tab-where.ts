import type { LeadStatus } from "@/generated/browser";
import type { Prisma } from "@/generated/client";
import { OUTREACH_TAB_BASE } from "@/lib/constants";

export type DashboardListParams = {
  tab: string;
  q: string;
  now: Date;
};

/** Outreach tabs that list only leads who still need their first email. */
export const isFreshOutreachTab = (tab: string): boolean =>
  tab !== "reminders" && tab !== "excluded";

const FRESH_OUTREACH = {
  emailCount: 0,
  ...OUTREACH_TAB_BASE,
} as const satisfies Prisma.LeadWhereInput;

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
      return { ...baseWhere, status: "CANCELED" as LeadStatus, ...FRESH_OUTREACH };
    case "never":
      return { ...baseWhere, status: "NEVER_SUBSCRIBED" as LeadStatus, ...FRESH_OUTREACH };
    case "not-emailed":
      return { ...baseWhere, ...FRESH_OUTREACH };
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
      return { ...baseWhere, ...FRESH_OUTREACH };
  }
};

const SORT_FIELDS = ["createdAt", "subscriptionCanceledAt", "lastEmailedAt", "emailCount"] as const;

export type DashboardSortField = (typeof SORT_FIELDS)[number];

export const normalizeDashboardSort = (sort: string): DashboardSortField =>
  SORT_FIELDS.includes(sort as DashboardSortField) ? (sort as DashboardSortField) : "createdAt";
