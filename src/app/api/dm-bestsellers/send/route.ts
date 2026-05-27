import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  authorId: z.number().int().positive(),
  handle: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  clientId: z.string().min(1),
  threadId: z.string().min(1),
});

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const now = new Date();
  const status = await prisma.bestsellerDM.upsert({
    where: { authorId: body.authorId },
    update: {
      handle: body.handle ?? undefined,
      name: body.name ?? undefined,
      clientId: body.clientId,
      wasSent: true,
      sentAt: now,
      lastCheckedAt: now,
      threadId: body.threadId,
    },
    create: {
      authorId: body.authorId,
      handle: body.handle ?? null,
      name: body.name ?? null,
      clientId: body.clientId,
      wasSent: true,
      sentAt: now,
      lastCheckedAt: now,
      threadId: body.threadId,
    },
  });

  return NextResponse.json({ status });
};
