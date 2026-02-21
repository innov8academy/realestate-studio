import { NextRequest, NextResponse } from "next/server";
import {
  createAuthToken,
  isAuthed,
  getAuthCookieName,
} from "@/lib/security";

export { isAuthed };

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not set in environment" }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const token = createAuthToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getAuthCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(getAuthCookieName());
  return res;
}
