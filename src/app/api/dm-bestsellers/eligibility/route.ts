import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAndSaveEligibilityBatch } from "@/lib/dm-bestsellers/check-eligibility";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  authorIds: z.array(z.number().int().positive()).min(1).max(50),
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

  try {
    const results = await checkAndSaveEligibilityBatch(body.authorIds);
    return NextResponse.json({
      results: results.map(({ authorId, noteCount, isSendingNotes }) => ({
        authorId,
        noteCount,
        isSendingNotes,
      })),
      statuses: results.map((r) => r.status),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eligibility check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
