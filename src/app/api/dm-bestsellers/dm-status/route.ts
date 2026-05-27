import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseDmStatusDate } from "@/lib/dm-bestsellers/dm-status-entry";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const parseAuthorIds = (raw: string | null): number[] => {
  if (!raw) return [];
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return Array.from(new Set(out));
};

export const GET = async (req: NextRequest) => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const authorIds = parseAuthorIds(url.searchParams.get("authorIds"));
  if (authorIds.length === 0) {
    return NextResponse.json({ statuses: [] });
  }

  const rows = await prisma.bestsellerDM.findMany({
    where: { authorId: { in: authorIds } },
  });

  return NextResponse.json({ statuses: rows });
};

const optionalDateField = z.preprocess(
  (val) => parseDmStatusDate(val),
  z.date().nullable(),
);

const upsertBody = z.object({
  entries: z
    .array(
      z.object({
        authorId: z.number().int().positive(),
        handle: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        threadId: z.string().nullable().optional(),
        wasSent: z.boolean(),
        sentAt: optionalDateField.optional(),
        lastReplyAt: optionalDateField.optional(),
        canSendDm: z.boolean().nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof upsertBody>;
  try {
    const json = await req.json();
    body = upsertBody.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const now = new Date();
  const results = await prisma.$transaction(
    body.entries.map((entry) =>
      prisma.bestsellerDM.upsert({
        where: { authorId: entry.authorId },
        update: {
          handle: entry.handle ?? undefined,
          name: entry.name ?? undefined,
          threadId: entry.threadId ?? undefined,
          wasSent: entry.wasSent,
          sentAt: entry.sentAt ?? null,
          lastReplyAt: entry.lastReplyAt ?? null,
          canSendDm: entry.canSendDm,
          lastCheckedAt: now,
        },
        create: {
          authorId: entry.authorId,
          handle: entry.handle ?? null,
          name: entry.name ?? null,
          threadId: entry.threadId ?? null,
          wasSent: entry.wasSent,
          sentAt: entry.sentAt ?? null,
          lastReplyAt: entry.lastReplyAt ?? null,
          canSendDm: entry.canSendDm,
          lastCheckedAt: now,
        },
      }),
    ),
  );

  return NextResponse.json({ statuses: results });
};
