"use server";

import { prisma } from "@/lib/db/prisma";
import { resend } from "@/lib/resend/client";
import { renderEmail } from "@/lib/resend/render";
import { buildVarMap } from "@/lib/templates/render-vars";
import { startOfUtcDay } from "@/lib/time";
import { getSession } from "@/lib/auth/session";
import { addDays } from "date-fns";
import { composeTemplateSlugForLeadStatus } from "@/lib/constants";

type SendEmailInput = {
  leadId: string;
  subject: string;
  bodyJson: object;
  templateId?: string;
};

type SendEmailResult =
  | { ok: true; emailLogId: string; resendMessageId: string | null }
  | { ok: false; error: string };

export const sendWinbackEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const session = await getSession();
  if (!session.isLoggedIn) return { ok: false, error: "Unauthorized" };

  const { leadId, subject, bodyJson, templateId } = input;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found" };
  if (lead.didUnsubscribeFromEmail) {
    return { ok: false, error: "Lead opted out of email in WriteStack" };
  }
  if (lead.unsubscribedAt) return { ok: false, error: "Lead has unsubscribed" };
  if (lead.excludedAt) return { ok: false, error: "Lead is excluded" };

  const dailyCap = Number(process.env.DAILY_SEND_CAP ?? 100);
  const sentToday = await prisma.emailLog.count({
    where: { sentAt: { gte: startOfUtcDay() } },
  });
  if (sentToday >= dailyCap) {
    return { ok: false, error: `Daily cap of ${dailyCap} reached` };
  }

  const vars = buildVarMap(lead);

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = renderEmail(bodyJson, subject, vars);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Render error" };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;

  if(!fromAddress) {
    throw new Error("From address not set");
  }

  if(!replyTo) {
    throw new Error("Reply-to address not set");
  }

  // Insert log (QUEUED) first for idempotency
  const emailLog = await prisma.emailLog.create({
    data: {
      leadId,
      templateId: templateId ?? null,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      fromAddress,
      toAddress: lead.email,
      status: "QUEUED",
    },
  });

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: lead.email,
      // to: "orelsmail@gmail.com",
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "FAILED", errorMessage: result.error.message },
      });
      return { ok: false, error: result.error.message };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          resendMessageId: result.data?.id ?? null,
          status: "SENT",
          sentAt: now,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          firstEmailedAt: lead.firstEmailedAt ?? now,
          lastEmailedAt: now,
          emailCount: { increment: 1 },
          remindAt: addDays(now, 7),
          reminderDismissedAt: null,
        },
      }),
    ]);

    return {
      ok: true,
      emailLogId: emailLog.id,
      resendMessageId: result.data?.id ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return { ok: false, error: message };
  }
};

/** Sends the same template the compose drawer auto-loads for this lead’s status (e.g. warm-reactivate for never paid). */
export const sendDefaultWinbackEmail = async (leadId: string): Promise<SendEmailResult> => {
  const session = await getSession();
  if (!session.isLoggedIn) return { ok: false, error: "Unauthorized" };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found" };

  const slug = composeTemplateSlugForLeadStatus(lead.status);
  const template = await prisma.emailTemplate.findUnique({
    where: { slug },
    select: { id: true, subject: true, bodyJson: true },
  });
  if (!template) {
    return {
      ok: false,
      error: `No email template with slug “${slug}”. Create it under Email templates.`,
    };
  }

  return sendWinbackEmail({
    leadId,
    subject: template.subject,
    bodyJson: template.bodyJson as object,
    templateId: template.id,
  });
};
