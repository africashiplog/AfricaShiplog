import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { reopenSessionSchema } from "@/lib/validation/cash-session";
import { reopenSession, CashRegisterServiceError } from "@/services/cash-register-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("cash.reopen");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = reopenSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const closing = await reopenSession(id, user.id, parsed.data.reason);
    await writeAuditLog({ userId: user.id, action: "CASH_SESSION_REOPEN", entityType: "CashRegisterSession", entityId: id, newData: { reason: parsed.data.reason } });
    return NextResponse.json({ closing });
  } catch (e) {
    if (e instanceof CashRegisterServiceError) return NextResponse.json({ error: "cash_error", message: e.message }, { status: e.status });
    throw e;
  }
}
