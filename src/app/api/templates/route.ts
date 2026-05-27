import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const GET = async (req: NextRequest) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (slug) {
    const template = await prisma.emailTemplate.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        subject: true,
        bodyJson: true,
      },
    });
    return NextResponse.json(template ? [template] : []);
  }

  const q = url.searchParams.get("q") ?? "";

  const templates = await prisma.emailTemplate.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      subject: true,
      bodyJson: true,
    },
  });

  return NextResponse.json(templates);
};
