import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";
import { sessionOptions } from "@/lib/auth/config";

const PUBLIC_PATHS = [
  "/login",
  "/api/sync/run",
  "/api/resend/webhook",
  "/api/test",
];

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const proxy = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
};
