import type { Lead, LeadStatus } from "@/generated/browser";
import { daysSince } from "@/lib/time";

type VarMap = Record<string, string>;

const lineForLeadStatus = (status: LeadStatus): string => {
  switch (status) {
    case "NEVER_SUBSCRIBED":
      return "You signed up but didn't subscribe";
    case "CANCELED":
      return "You subscribed and canceled the subscription";
    case "PAST_DUE":
      return "Your WriteStack subscription is past due";
  }
};

export const buildVarMap = (
  lead: Pick<
    Lead,
    | "firstName"
    | "lastName"
    | "substackHandle"
    | "subscriptionCanceledAt"
    | "lastPlanName"
    | "status"
  >,
): VarMap => ({
  firstName: lead.firstName ?? "there",
  lastName: lead.lastName ?? "",
  substackHandle: lead.substackHandle ?? "",
  daysSinceCanceled: String(daysSince(lead.subscriptionCanceledAt) ?? ""),
  lastPlanName: lead.lastPlanName ?? "",
  "you-status": lineForLeadStatus(lead.status),
});

export const interpolate = (template: string, vars: VarMap): string =>
  template.replace(/\{\{([\w-]+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined ? escapeHtml(val) : `{{${key}}}`;
  });

export const interpolatePlain = (template: string, vars: VarMap): string =>
  template.replace(/\{\{([\w-]+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);

export const hasUnresolvedVars = (str: string): boolean => /\{\{[^}]+\}\}/.test(str);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
