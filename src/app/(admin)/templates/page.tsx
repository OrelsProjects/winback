import { prisma } from "@/lib/db/prisma";
import { TemplatesPageClient } from "./page-client";

export default async function TemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return <TemplatesPageClient templates={templates} />;
}
