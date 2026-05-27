"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

const requireAuth = async () => {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("Unauthorized");
};

export const excludeLead = async (leadId: string): Promise<{ error: string } | null> => {
  try {
    await requireAuth();
    await prisma.lead.update({
      where: { id: leadId },
      data: { excludedAt: new Date(), excludedReason: "manual" },
    });
    return null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};

export const unsubscribeLead = async (leadId: string): Promise<{ error: string } | null> => {
  try {
    await requireAuth();
    await prisma.lead.update({
      where: { id: leadId },
      data: { unsubscribedAt: new Date() },
    });
    return null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};

export const dismissReminder = async (leadId: string): Promise<{ error: string } | null> => {
  try {
    await requireAuth();
    await prisma.lead.update({
      where: { id: leadId },
      data: { reminderDismissedAt: new Date() },
    });
    return null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};
