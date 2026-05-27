import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { BESTSELLER_PAGE_SIZE } from "@/lib/dm-bestsellers/constants";
import {
  filterEligibleBestsellers,
  rerankBestsellers,
} from "@/lib/dm-bestsellers/eligible-for-display";
import { getBestsellersPage } from "@/lib/dm-bestsellers/sync-bestsellers";
import { prisma } from "@/lib/db/prisma";

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
    const data = await getBestsellersPage({ categoryKey, page, pageSize });
    const authorIds = data.bestsellers
      .map((b) => b.authorId)
      .filter((id): id is number => id != null);

    const statuses =
      authorIds.length === 0
        ? []
        : await prisma.bestsellerDM.findMany({
            where: { authorId: { in: authorIds } },
          });

    const statusByAuthor = new Map(statuses.map((row) => [row.authorId, row]));
    const filtered = filterEligibleBestsellers(data.bestsellers, statusByAuthor);
    const startRank = page * pageSize;

    return NextResponse.json({
      ...data,
      bestsellers: rerankBestsellers(filtered, startRank),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
