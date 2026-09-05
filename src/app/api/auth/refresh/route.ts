import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";

export async function POST() {
  const ok = await refreshSession();
  if (!ok) {
    return NextResponse.json(
      { error: "session_expired", message: "انتهت جلستك، يرجى تسجيل الدخول مجددًا" },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
