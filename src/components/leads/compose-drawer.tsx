"use client";

import { useState, useCallback, useEffect } from "react";
import type { Lead } from "@/generated/browser";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { SubjectLineEditor } from "@/components/editor/subject-line-editor";
import { EmailPreview } from "@/components/editor/email-preview";
import { DailyCapPill } from "./daily-cap-pill";
import { buildVarMap, hasUnresolvedVars, interpolatePlain } from "@/lib/templates/render-vars";
import { sendWinbackEmail } from "./send-email-action";
import { toastEmailSentWithView } from "./email-sent-toast";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateHTML } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { LEAD_STATUS_LABELS, composeTemplateSlugForLeadStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  emailsSentToday: number;
  dailyCap: number;
  onEmailSent?: () => void;
};

const EXTENSIONS = [StarterKit, Link];

const emptyBody = (): object => ({ type: "doc", content: [{ type: "paragraph" }] });

type SlugTemplatePayload = {
  id: string;
  subject: string;
  bodyJson: object;
};

export const ComposeDrawer = ({ open, onOpenChange, lead, emailsSentToday, dailyCap, onEmailSent }: Props) => {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [bodyJson, setBodyJson] = useState<object>(emptyBody());
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const slug = composeTemplateSlugForLeadStatus(lead.status);
    let cancelled = false;
    setSourceTemplateId(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/templates?slug=${encodeURIComponent(slug)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SlugTemplatePayload[];
        const t = data[0];
        if (cancelled) return;
        if (!t?.subject || t.bodyJson == null) {
          setSubject("");
          setBodyJson(emptyBody());
          toast.info(`No template found with slug “${slug}”. Create it under Email templates to auto-fill.`);
          return;
        }
        setSubject(t.subject);
        setBodyJson(t.bodyJson);
        setSourceTemplateId(t.id);
      } catch {
        if (!cancelled) toast.error("Could not load template");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, lead.id, lead.status]);

  const vars = buildVarMap(lead);
  const renderedSubject = interpolatePlain(subject, vars);
  const bodyHtml = (() => {
    try {
      return generateHTML(bodyJson, EXTENSIONS);
    } catch {
      return "";
    }
  })();

  const atCap = emailsSentToday >= dailyCap;
  const optedOutOfEmail = lead.didUnsubscribeFromEmail || lead.unsubscribedAt !== null;
  const hasUnresolved = hasUnresolvedVars(renderedSubject) || hasUnresolvedVars(interpolatePlain(bodyHtml, vars));
  const canSend = !atCap && !optedOutOfEmail && !hasUnresolved && subject.trim().length > 0;

  const handleApplySubject = useCallback((newSubject: string) => {
    setSubject(newSubject);
  }, []);

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      const result = await sendWinbackEmail({
        leadId: lead.id,
        subject,
        bodyJson,
        templateId: sourceTemplateId ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toastEmailSentWithView(result.resendMessageId);
      onEmailSent?.();
      onOpenChange(false);
      setSubject("");
      setBodyJson(emptyBody());
      setSourceTemplateId(null);
      router.refresh();
    } finally {
      setIsSending(false);
    }
  };

  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base">Compose to {displayName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{lead.email}</span>
                <Badge variant="outline" className="text-xs">
                  {LEAD_STATUS_LABELS[lead.status]}
                </Badge>
                {lead.didUnsubscribeFromEmail && (
                  <Badge variant="destructive" className="text-xs">
                    WriteStack email opt-out
                  </Badge>
                )}
              </div>
            </div>
            <DailyCapPill sent={emailsSentToday} cap={dailyCap} />
          </div>
        </SheetHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Compose pane */}
          <div className="flex flex-col flex-1 min-w-0 px-6 py-4 overflow-y-auto space-y-4 border-r">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <SubjectLineEditor
                prosemirrorId="subject"
                value={subject}
                onChange={setSubject}
                interpolationPreview={vars}
              />
            </div>

            <div className="space-y-1.5 flex-1">
              <Label>Body</Label>
              <p className="text-xs text-muted-foreground">
                Type <kbd className="font-mono bg-muted px-1 rounded">/</kbd> to load a template
              </p>
              <TiptapEditor
                value={bodyJson}
                onChange={setBodyJson}
                onApplySubject={handleApplySubject}
                enableSlash
                className="flex-1"
                interpolationPreview={vars}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!canSend || isSending}
                className={cn((atCap || optedOutOfEmail) && "opacity-50 cursor-not-allowed")}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending
                  ? "Sending…"
                  : optedOutOfEmail
                    ? "Cannot email"
                    : atCap
                      ? "Cap reached"
                      : "Send via Resend"}
              </Button>
            </div>
          </div>

          {/* Preview pane */}
          <div className="w-80 shrink-0 px-4 py-4 overflow-y-auto">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">
              Preview
            </Label>
            <EmailPreview html={bodyHtml} vars={vars} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
