import type { EmailLog, Lead } from "@/generated/browser";
import { LeadRow } from "./lead-row";
import { Bell } from "lucide-react";

type LeadWithEmail = Lead & { emails: EmailLog[] };

type Props = {
  leads: LeadWithEmail[];
};

export const RemindersSection = ({ leads }: Props) => {
  if (leads.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 dark:border-amber-900">
        <Bell className="h-4 w-4 text-amber-600" />
        <span className="font-medium text-sm text-amber-800 dark:text-amber-400">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} need a follow-up
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                showReminderBadge
                emailsSentToday={0}
                dailyCap={Number(process.env.DAILY_SEND_CAP ?? 100)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
