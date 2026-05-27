"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getLeadIdsForBulkSend } from "./complete-cap-action";
import { sendDefaultWinbackEmail } from "./send-email-action";
import { delay } from "@/lib/batch";
import { Loader2, Zap } from "lucide-react";

type Props = {
  tab: string;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  emailsSentToday: number;
  dailyCap: number;
};

type RunUi =
  | { phase: "preparing" }
  | { phase: "sending"; sent: number; total: number }
  | { phase: "pause"; sent: number; total: number };

export const CompleteCapButton = ({
  tab,
  sort,
  dir,
  q,
  emailsSentToday,
  dailyCap,
}: Props) => {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [runUi, setRunUi] = useState<RunUi | null>(null);
  const runLockRef = useRef(false);

  const remaining = Math.max(0, dailyCap - emailsSentToday);
  const disabled =
    isRunning || tab === "excluded" || remaining <= 0;

  const handleSendToCompleteCap = useCallback(async () => {
    if (tab === "excluded") return;
    if (dailyCap - emailsSentToday <= 0) return;
    if (runLockRef.current) return;
    runLockRef.current = true;
    setIsRunning(true);
    setRunUi({ phase: "preparing" });
    const loadingId = toast.loading("Preparing bulk send…");
    try {
      const prep = await getLeadIdsForBulkSend({ tab, sort, dir, q });
      if (!prep.ok) {
        toast.dismiss(loadingId);
        toast.error(prep.error);
        return;
      }

      const { leadIds } = prep;
      if (leadIds.length === 0) {
        toast.dismiss(loadingId);
        toast.info("No leads match the current filters.");
        return;
      }

      setRunUi({ phase: "sending", sent: 0, total: leadIds.length });
      toast.loading(`Sending: 0 / ${leadIds.length}…`, { id: loadingId });

      let sent = 0;
      for (let idx = 0; idx < leadIds.length; idx += 2) {
        const pair = leadIds.slice(idx, idx + 2);
        const results = await Promise.all(pair.map((id) => sendDefaultWinbackEmail(id)));

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (!result.ok) {
            toast.dismiss(loadingId);
            toast.error(result.error);
            if (sent > 0) {
              toast.success(`Stopped after ${sent} sent.`);
            }
            router.refresh();
            return;
          }
          sent++;
          setRunUi({ phase: "sending", sent, total: leadIds.length });
          toast.loading(`Sending: ${sent} / ${leadIds.length}…`, { id: loadingId });
        }

        const hasMore = idx + 2 < leadIds.length;
        if (hasMore) {
          setRunUi({ phase: "pause", sent, total: leadIds.length });
          await delay(1000);
          setRunUi({ phase: "sending", sent, total: leadIds.length });
        }
      }

      toast.dismiss(loadingId);
      toast.success(`Sent ${sent} email${sent === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e instanceof Error ? e.message : "Bulk send failed");
      router.refresh();
    } finally {
      runLockRef.current = false;
      setIsRunning(false);
      setRunUi(null);
    }
  }, [tab, sort, dir, q, router, emailsSentToday, dailyCap]);

  const ariaLabel =
    tab === "excluded"
      ? "Bulk send not available on Excluded tab"
      : remaining <= 0
        ? "Daily send cap reached"
        : runUi?.phase === "preparing"
          ? "Preparing bulk send queue"
          : runUi?.phase === "pause"
            ? `Pausing between batches, ${runUi.sent} of ${runUi.total} emails sent`
            : runUi?.phase === "sending"
              ? `Sending bulk emails, ${runUi.sent} of ${runUi.total} complete`
              : `Send default template to leads until the daily cap is reached. Today ${emailsSentToday} of ${dailyCap} sent, ${remaining} slots left.`;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              aria-busy={isRunning}
              aria-label={ariaLabel}
              onClick={handleSendToCompleteCap}
              className="h-auto min-w-50 flex-col items-stretch gap-0.5 py-2 px-3"
            >
              <span className="flex items-center justify-center gap-2 text-sm font-medium leading-none">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Zap className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {runUi?.phase === "preparing"
                  ? "Preparing queue…"
                  : runUi?.phase === "pause"
                    ? "Between batches"
                    : runUi?.phase === "sending"
                      ? "Sending"
                      : "Send to complete cap"}
              </span>
              <span className="text-[11px] font-normal tabular-nums text-muted-foreground leading-tight text-center">
                {runUi?.phase === "preparing"
                  ? "Fetching leads…"
                  : runUi?.phase === "pause"
                    ? `${runUi.sent} / ${runUi.total} · wait 1s`
                    : runUi?.phase === "sending" && runUi.total > 0
                      ? `Progress ${runUi.sent} / ${runUi.total}`
                      : `${emailsSentToday} / ${dailyCap} today · ${remaining} left`}
              </span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>
            Today <span className="tabular-nums font-medium">{emailsSentToday}</span> /{" "}
            <span className="tabular-nums font-medium">{dailyCap}</span> sent ·{" "}
            <span className="tabular-nums font-medium">{remaining}</span> slots left on the cap.
          </p>
          <p className="mt-1.5 text-muted-foreground">
            Sends the default template per lead status in current sort order (batches of 2, 1s pause).
            Same filters as the table.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
