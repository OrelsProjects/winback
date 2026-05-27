"use server";

import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/auth/session";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (ip: string) => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;

  entry.count++;
  return true;
};

export const loginAction = async (
  password: string,
): Promise<{ error: string } | null> => {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return { error: "Server misconfiguration." };

  const allowed = checkRateLimit("global");
  if (!allowed) return { error: "Too many attempts. Try again in a minute." };

  let match = false;
  try {
    const providedBuf = Buffer.from(password);
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length === expectedBuf.length) {
      match = timingSafeEqual(providedBuf, expectedBuf);
    }
  } catch {
    match = false;
  }

  if (!match) return { error: "Incorrect password." };

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  return null;
};

export const logoutAction = async () => {
  const session = await getSession();
  session.destroy();
};
