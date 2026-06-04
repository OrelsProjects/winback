"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { addDays } from "date-fns";
import type { EmailLog, Lead } from "@/generated/browser";
import { EmailStatus } from "@/generated/browser";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadRow } from "./lead-row";
import { LeadPagination } from "./lead-pagination";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { REMINDER_DAYS } from "@/lib/constants";
import { isFreshOutreachTab } from "@/lib/leads/build-dashboard-tab-where";

type LeadWithEmail = Lead & { emails: EmailLog[] };

type Props = {
  leads: LeadWithEmail[];
  total: number;
  page: number;
  totalPages: number;
  emailsSentToday: number;
  dailyCap: number;
};

const sentEmailStub = (lead: LeadWithEmail, now: Date): EmailLog =>
  ({
    id: "__optimistic-sent__",
    leadId: lead.id,
    templateId: null,
    subject: "",
    bodyHtml: "",
    bodyText: "",
    fromAddress: "",
    toAddress: lead.email,
    resendMessageId: null,
    status: EmailStatus.SENT,
    sentAt: now,
    deliveredAt: null,
    bouncedAt: null,
    errorMessage: null,
    createdAt: now,
  }) as EmailLog;

export const LeadList = ({ leads: initialLeads, total, page, totalPages, emailsSentToday, dailyCap }: Props) => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "all";

  const serverFingerprint = useMemo(
    () =>
      JSON.stringify(
        initialLeads.map((l) => ({
          id: l.id,
          emailCount: l.emailCount,
          excludedAt: l.excludedAt?.toISOString() ?? null,
          unsubscribedAt: l.unsubscribedAt?.toISOString() ?? null,
          didUnsubscribe: l.didUnsubscribeFromEmail,
        })),
      ),
    [initialLeads],
  );

  const [leads, setLeads] = useState(initialLeads);
  const initialRef = useRef(initialLeads);
  initialRef.current = initialLeads;

  useEffect(() => {
    setLeads(initialRef.current);
  }, [serverFingerprint]);

  const handleRemove = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleEmailSent = (leadId: string) => {
    const now = new Date();
    if (isFreshOutreachTab(tab)) {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      return;
    }
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        return {
          ...l,
          emailCount: l.emailCount + 1,
          firstEmailedAt: l.firstEmailedAt ?? now,
          lastEmailedAt: now,
          remindAt: addDays(now, REMINDER_DAYS),
          reminderDismissedAt: null,
          emails: [sentEmailStub(l, now)],
        };
      }),
    );
  };

  if (leads.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 gap-3">
        <Users className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">No leads found</p>
        <p className="text-sm text-muted-foreground">Try adjusting the filters or run a sync.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Canceled</TableHead>
              <TableHead>Last emailed</TableHead>
              <TableHead>Emails</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                emailsSentToday={emailsSentToday}
                dailyCap={dailyCap}
                onRemove={handleRemove}
                onEmailSent={() => handleEmailSent(lead.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <LeadPagination page={page} totalPages={totalPages} total={total} />
      )}
    </div>
  );
};
