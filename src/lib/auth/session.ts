import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "./config";

export interface SessionData {
  isLoggedIn: boolean;
}

export const getSession = async () => {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
};
