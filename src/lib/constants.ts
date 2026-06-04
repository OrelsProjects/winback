import type { LeadStatus } from "@/generated/browser";

export const DAILY_SEND_CAP = Number(process.env.DAILY_SEND_CAP ?? 100);
export const REMINDER_DAYS = 7;

/** Footer link in outbound emails (WriteStack-hosted unsubscribe). */
export const WRITESTACK_UNSUBSCRIBE_URL =
  "https://www.writestack.io/unsubscribe";

/** Must match filters on main outreach tabs so opted-out leads never appear with active cohorts. */
export const OUTREACH_TAB_BASE = {
  excludedAt: null,
  unsubscribedAt: null,
  didUnsubscribeFromEmail: false,
} as const;

/** Compose drawer auto-picks this slug for leads who never subscribed. */
export const COMPOSE_TEMPLATE_SLUG_REACTIVATE = "warm-reactivate";
/** Compose drawer auto-picks this slug for leads who subscribed (incl. canceled / past due). */
export const COMPOSE_TEMPLATE_SLUG_CHURN = "warm-churn";

export const composeTemplateSlugForLeadStatus = (
  status: LeadStatus,
): string => {
  switch (status) {
    case "NEVER_SUBSCRIBED":
      return COMPOSE_TEMPLATE_SLUG_REACTIVATE;
    case "CANCELED":
    case "PAST_DUE":
      return COMPOSE_TEMPLATE_SLUG_CHURN;
  }
};

export const LEAD_STATUS_LABELS = {
  CANCELED: "Canceled",
  NEVER_SUBSCRIBED: "Never paid",
  PAST_DUE: "Past due",
} as const;

export const TEMPLATE_VARIABLES = [
  { token: "{{firstName}}", label: "First name", fallback: "there" },
  { token: "{{lastName}}", label: "Last name", fallback: "" },
  { token: "{{substackHandle}}", label: "Substack handle", fallback: "" },
  {
    token: "{{daysSinceCanceled}}",
    label: "Days since canceled",
    fallback: "",
  },
  { token: "{{lastPlanName}}", label: "Last plan", fallback: "" },
  {
    token: "{{you-status}}",
    label: "Their status (you phrasing)",
    fallback: "",
  },
] as const;

/** Sample merge values for highlighting variables in the template subject/body editors (no lead context). */
export const TEMPLATE_EDITOR_PREVIEW_VARS = (() => {
  const out: Record<string, string> = {};
  for (const { token, fallback } of TEMPLATE_VARIABLES) {
    const match = token.match(/\{\{([\w-]+)\}\}/);
    if (!match) continue;
    out[match[1]] = fallback;
  }
  out.lastPlanName = "Pro Monthly";
  out["you-status"] = "You signed up but didn't subscribe";
  out.daysSinceCanceled = "14";
  return out;
})();

/** First tokens parsed from publication titles — not usable as a personal greeting. */
const GENERIC_DM_GREETING_NAMES = new Set(
  [
    "a",
    "an",
    "the",
    "your",
    "my",
    "our",
    "their",
    "this",
    "that",
    "dear",
    "hi",
    "hello",
    "hey",
    "friend",
    "reader",
    "subscriber",
    "user",
    "author",
    "writer",
    "creator",
    "newsletter",
    "publication",
    "substack",
    "unknown",
    "anonymous",
    "anon",
    "none",
    "null",
    "test",
    "admin",
    "team",
    "staff",
    "editor",
    "guest",
    "everyone",
    "folks",
    "friends",
    "position",
    "there",
    "disciplined",
    "md",
    "dr",
    "doctor",
    "mds",
  ].map((word) => word.toLowerCase()),
);

export const greetingNameForDm = (name?: string): string => {
  const trimmed = name?.trim();
  if (!trimmed) return "there";

  const first = trimmed.split(/\s+/)[0]?.replace(/[^\p{L}\p{N}'-]/gu, "") ?? "";
  if (!first || GENERIC_DM_GREETING_NAMES.has(first.toLowerCase()))
    return "there";

  return first;
};

export const getBargeDM = (name?: string) => {
  const greeting = greetingNameForDm(name);
  return `Hey ${greeting} :)\n\nSorry to barge into your DMs, but I saw that you are putting out Notes daily and I built a platform that'll help you automate it.\nThere's everything from a Notes bulk scheduler to deep analytics to help you figure out which notes converted to paid subs (and free), which ones brought traffic, and anything else you'd need.\n\nIf you're interested, I'd love to share it with you.`;
};
