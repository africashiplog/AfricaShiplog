import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { resumeReopenedSession, CashRegisterServiceError } from "@/services/cash-register-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("cash.reopen");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    const session = await resumeReopenedSession(id);
    await writeAuditLog({ userId: user.id, action: "CASH_SESSION_RESUME", entityType: "CashRegisterSession", entityId: id });
    return NextResponse.json({ session });
  } catch (e) {
    if (e instanceof CashRegisterServiceError) return NextResponse.json({ error: "cash_error", message: e.message }, { status: e.status });
    throw e;
  }
}
