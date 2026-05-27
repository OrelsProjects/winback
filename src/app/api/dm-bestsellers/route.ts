import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { BESTSELLER_PAGE_SIZE } from "@/lib/dm-bestsellers/constants";
import { getDmBestsellersPage } from "@/lib/dm-bestsellers/sync-bestsellers";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = async (req: NextRequest) => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const categoryKey = url.searchParams.get("categoryKey")?.trim();
  if (!categoryKey) {
    return NextResponse.json(
      { error: "categoryKey is required" },
      { status: 400 },
    );
  }

  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const pageSize = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? BESTSELLER_PAGE_SIZE)),
  );

  try {
    const data = await getDmBestsellersPage({ categoryKey, page, pageSize });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
