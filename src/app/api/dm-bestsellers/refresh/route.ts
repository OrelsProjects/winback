import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { syncAllBestsellersFromSubstack } from "@/lib/dm-bestsellers/sync-bestsellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = async () => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllBestsellersFromSubstack();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
