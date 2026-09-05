import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { destroySession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await writeAuditLog({ userId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id, branchId: user.branchId });
  }
  return NextResponse.json({ ok: true });
}
