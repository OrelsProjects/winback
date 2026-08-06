import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_AFTER_THREAD_ID = "4bb560e1-d895-4caa-a1ea-bd3acdb2b224";

const sentDmSelect = {
  id: true,
  authorId: true,
  handle: true,
  name: true,
  threadId: true,
  clientId: true,
  sentAt: true,
} as const;

export async function GET(req: NextRequest) {
  const afterThreadId =
    req.nextUrl.searchParams.get("afterThreadId") ?? DEFAULT_AFTER_THREAD_ID;

  const allSent = await prisma.bestsellerDM.findMany({
    where: { wasSent: true },
    orderBy: { sentAt: "desc" },
    select: sentDmSelect,
  });

  const referenceIndex = allSent.findIndex(
    (row) => row.threadId === afterThreadId,
  );

  if (referenceIndex === -1) {
    return NextResponse.json(
      {
        error: "Reference thread not found among sent DMs",
        afterThreadId,
        allSentCount: allSent.length,
        allSent,
        sentAfter: [],
      },
      { status: 404 },
    );
  }

  const reference = allSent[referenceIndex];
  const sentAfter = allSent.slice(0, referenceIndex);

  if (sentAfter.length > 12) {
    return NextResponse.json(
      {
        error: "Too many sent DMs after reference thread",
        afterThreadId,
        allSentCount: allSent.length,
        allSent,
        sentAfterCount: sentAfter.length,
        sentAfter,
      },
      { status: 400 },
    );
  }

  // All those sent after were false positive. Remove the 
  // await prisma.bestsellerDM.updateMany({
  //   where: { threadId: { in: sentAfter.map((row) => row.threadId!) } },
  //   data: { wasSent: false },
  // });

  return NextResponse.json({
    afterThreadId,
    reference,
    sentAfterCount: sentAfter.length,
    sentAfter,
    allSentCount: allSent.length,
    allSent,
  });
}
