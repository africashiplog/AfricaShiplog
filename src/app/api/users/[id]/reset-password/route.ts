import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { resetUserPassword, UserServiceError } from "@/services/user-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("users.manage");
  if (auth instanceof NextResponse) return auth;
  const { user: actor } = auth;

  const { id } = await params;
  try {
    const tempPassword = await resetUserPassword(id);
    await writeAuditLog({ userId: actor.id, action: "USER_PASSWORD_RESET", entityType: "User", entityId: id });
    return NextResponse.json({ tempPassword });
  } catch (e) {
    if (e instanceof UserServiceError) {
      return NextResponse.json({ error: "user_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
