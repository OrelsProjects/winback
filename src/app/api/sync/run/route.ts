import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { pullFromWritestack } from "@/lib/sync/pull-from-writestack";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const isAuthorizedCron = (req: NextRequest) => {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  return expected && secret === expected;
};

export const POST = async (req: NextRequest) => {
  // Allow authenticated admin OR cron job
  const cronOk = isAuthorizedCron(req);
  if (!cronOk) {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const syncRun = await prisma.syncRun.create({ data: {} });

  try {
    const result = await pullFromWritestack(syncRun.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =  err instanceof Error ? err.message : "Unknown error";
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
