import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { closeSessionSchema } from "@/lib/validation/cash-session";
import { closeSession, CashRegisterServiceError } from "@/services/cash-register-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("cash.close");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = closeSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const closing = await closeSession(id, user.id, parsed.data.actualCash, parsed.data.differenceReason ?? null);
    await writeAuditLog({
      userId: user.id,
      action: "CASH_SESSION_CLOSE",
      entityType: "CashRegisterSession",
      entityId: id,
      newData: { actualCash: closing.actualCash, differenceAmount: closing.differenceAmount },
    });
    return NextResponse.json({ closing });
  } catch (e) {
    if (e instanceof CashRegisterServiceError) return NextResponse.json({ error: "cash_error", message: e.message }, { status: e.status });
    throw e;
  }
}
