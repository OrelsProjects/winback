import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { checkAreSubscribers } from "@/lib/dm-bestsellers/check-are-subscribers";

export const runtime = "nodejs";

const bodySchema = z.object({
  authors: z
    .array(
      z.object({
        authorId: z.number().int().positive(),
        handle: z.string().nullable(),
        name: z.string().nullable(),
      }),
    )
    .min(1)
    .max(500),
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
    return NextResponse.json(await checkAreSubscribers(body.authors));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Subscriber check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
