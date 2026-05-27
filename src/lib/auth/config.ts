import type { SessionOptions } from "iron-session";

export const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET as string,
  cookieName: "admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  },
};
