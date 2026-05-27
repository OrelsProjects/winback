import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDiscoverCategories } from "@/lib/dm-bestsellers/sync-bestsellers";

export const runtime = "nodejs";

export const GET = async () => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const categories = await getDiscoverCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
