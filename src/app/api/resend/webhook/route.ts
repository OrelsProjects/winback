import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendWebhookPayload = {
  type: string;
  data: {
    email_id?: string;
    message_id?: string;
    created_at?: string;
    to?: string[];
    subject?: string;
  };
};

export const POST = async (req: NextRequest) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";

  let event: ResendWebhookPayload;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const messageId = event.data.email_id ?? event.data.message_id;
  if (!messageId) return NextResponse.json({ ok: true });

  const now = new Date();

  try {
    switch (event.type) {
      case "email.delivered": {
        await prisma.emailLog.updateMany({
          where: { resendMessageId: messageId },
          data: { status: "DELIVERED", deliveredAt: now },
        });
        break;
      }
      case "email.bounced": {
        const log = await prisma.emailLog.findFirst({
          where: { resendMessageId: messageId },
          select: { id: true, leadId: true },
        });
        if (log) {
          await prisma.$transaction([
            prisma.emailLog.update({
              where: { id: log.id },
              data: { status: "BOUNCED", bouncedAt: now },
            }),
            prisma.lead.update({
              where: { id: log.leadId },
              data: { excludedAt: now, excludedReason: "bounce" },
            }),
          ]);
        }
        break;
      }
      case "email.complained": {
        const log = await prisma.emailLog.findFirst({
          where: { resendMessageId: messageId },
          select: { id: true, leadId: true },
        });
        if (log) {
          await prisma.$transaction([
            prisma.emailLog.update({
              where: { id: log.id },
              data: { status: "COMPLAINED" },
            }),
            prisma.lead.update({
              where: { id: log.leadId },
              data: {
                excludedAt: now,
                excludedReason: "complaint",
                unsubscribedAt: now,
              },
            }),
          ]);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "processing error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
