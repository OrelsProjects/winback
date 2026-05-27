"use client";

import { useState } from "react";
import type { EmailLog, Lead } from "@/generated/browser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SeePublicationButton } from "./see-publication-button";
import { ComposeDrawer } from "./compose-drawer";
import { sendDefaultWinbackEmail } from "./send-email-action";
import { toastEmailSentWithView } from "./email-sent-toast";
import { composeTemplateSlugForLeadStatus, LEAD_STATUS_LABELS } from "@/lib/constants";
import { formatRelativeDays, daysSince } from "@/lib/time";
import { excludeLead, dismissReminder, unsubscribeLead } from "./actions";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type LeadWithEmail = Lead & { emails: EmailLog[] };

type Props = {
  lead: LeadWithEmail;
  showReminderBadge?: boolean;
  emailsSentToday: number;
  dailyCap: number;
  onRemove?: (id: string) => void;
  onEmailSent?: (leadId: string) => void;
};

const getInitials = (first: string | null, last: string | null) => {
  const f = first?.[0] ?? "";
  const l = last?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
};

export const LeadRow = ({ lead, showReminderBadge, emailsSentToday, dailyCap, onRemove, onEmailSent }: Props) => {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [excludeOpen, setExcludeOpen] = useState(false);
  const [unsubOpen, setUnsubOpen] = useState(false);
  const [isQuickSending, setIsQuickSending] = useState(false);

  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
  const lastEmail = lead.emails[0];
  const daysCanc = daysSince(lead.subscriptionCanceledAt);
  const cannotReceiveEmail = lead.didUnsubscribeFromEmail || lead.unsubscribedAt !== null;
  const atCap = emailsSentToday >= dailyCap;
  const isExcluded = lead.excludedAt !== null;
  const canQuickSend = !cannotReceiveEmail && !atCap && !isExcluded;
  const defaultTemplateSlug = composeTemplateSlugForLeadStatus(lead.status);

  const handleDismissReminder = async () => {
    const result = await dismissReminder(lead.id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Reminder dismissed");
      router.refresh();
    }
  };

  const handleExclude = async () => {
    const result = await excludeLead(lead.id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Lead excluded");
      onRemove?.(lead.id);
    }
  };

  const handleUnsubscribe = async () => {
    const result = await unsubscribeLead(lead.id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Lead marked as unsubscribed");
      router.refresh();
    }
  };

  const handleQuickSend = async () => {
    if (!canQuickSend || isQuickSending) return;
    setIsQuickSending(true);
    try {
      const result = await sendDefaultWinbackEmail(lead.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toastEmailSentWithView(result.resendMessageId);
      onEmailSent?.(lead.id);
      router.refresh();
    } finally {
      setIsQuickSending(false);
    }
  };

  return (
    <>
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">
                {getInitials(lead.firstName, lead.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{displayName}</span>
                {lead.didUnsubscribeFromEmail && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    WriteStack email opt-out
                  </Badge>
                )}
                {lead.unsubscribedAt !== null && !lead.didUnsubscribeFromEmail && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Unsubscribed
                  </Badge>
                )}
                {showReminderBadge && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    <Bell className="h-3 w-3 mr-1" />
                    Reminder
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate block">{lead.email}</span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline" className="text-xs">
            {LEAD_STATUS_LABELS[lead.status]}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {lead.status === "CANCELED" && daysCanc !== null
            ? `${daysCanc}d ago`
            : lead.status === "NEVER_SUBSCRIBED"
              ? "Never paid"
              : "—"}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {lastEmail ? formatRelativeDays(lastEmail.createdAt) : "—"}
        </td>
        <td className="px-4 py-3">
          {lead.emailCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {lead.emailCount}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <SeePublicationButton handle={lead.substackHandle} />
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleQuickSend}
                      disabled={!canQuickSend || isQuickSending}
                      aria-label={
                        !canQuickSend
                          ? atCap
                            ? "Daily send cap reached"
                            : isExcluded
                              ? "Lead is excluded"
                              : "Cannot email this lead"
                          : `Send default template “${defaultTemplateSlug}”`
                      }
                    >
                      {isQuickSending ? "Sending…" : "Quick send"}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  Sends the “{defaultTemplateSlug}” template immediately (same as opening Compose).
                  {atCap ? " Disabled: daily cap reached." : ""}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              onClick={() => setComposeOpen(true)}
              disabled={cannotReceiveEmail}
              aria-label={cannotReceiveEmail ? "Cannot email this lead" : "Compose email"}
            >
              Compose
            </Button>
            {showReminderBadge && (
              <Button variant="ghost" size="sm" onClick={handleDismissReminder}>
                Dismiss
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setExcludeOpen(true)}
            >
              Exclude
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setUnsubOpen(true)}>
                  Mark unsubscribed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      <ComposeDrawer
        open={composeOpen}
        onOpenChange={setComposeOpen}
        lead={lead}
        emailsSentToday={emailsSentToday}
        dailyCap={dailyCap}
        onEmailSent={() => onEmailSent?.(lead.id)}
      />

      <AlertDialog open={excludeOpen} onOpenChange={setExcludeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exclude lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will be excluded from outreach. This can be reversed manually in the DB.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExclude} className="bg-destructive hover:bg-destructive/90">
              Exclude
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unsubOpen} onOpenChange={setUnsubOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as unsubscribed?</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will never receive emails from this tool again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribe}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
