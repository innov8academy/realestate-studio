import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "admin_tok";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not set in environment" }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const token = Buffer.from(password).toString("base64");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}

/** Helper used by other admin routes to verify auth */
export function isAuthed(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  try {
    return Buffer.from(token, "base64").toString("utf8") === expected;
  } catch {
    return false;
  }
}
