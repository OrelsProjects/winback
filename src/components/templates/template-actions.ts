"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { renderTiptapToHtml } from "@/lib/tiptap/server-extensions";
import { z } from "zod";

const requireAuth = async () => {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("Unauthorized");
};

const TemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  subject: z.string().min(1),
  bodyJson: z.unknown(),
});

type TemplateInput = z.infer<typeof TemplateSchema>;

export const createTemplate = async (input: TemplateInput): Promise<{ error?: string }> => {
  try {
    await requireAuth();
    const parsed = TemplateSchema.parse(input);
    const bodyHtml = renderTiptapToHtml(parsed.bodyJson as object);
    await prisma.emailTemplate.create({
      data: { ...parsed, bodyJson: parsed.bodyJson as object, bodyHtml },
    });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};

export const updateTemplate = async (
  id: string,
  input: TemplateInput,
): Promise<{ error?: string }> => {
  try {
    await requireAuth();
    const parsed = TemplateSchema.parse(input);
    const bodyHtml = renderTiptapToHtml(parsed.bodyJson as object);
    await prisma.emailTemplate.update({
      where: { id },
      data: { ...parsed, bodyJson: parsed.bodyJson as object, bodyHtml },
    });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};

export const deleteTemplate = async (id: string): Promise<{ error?: string }> => {
  try {
    await requireAuth();
    await prisma.emailTemplate.delete({ where: { id } });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
};
