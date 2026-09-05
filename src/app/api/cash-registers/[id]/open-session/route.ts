import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import { openSession, CashRegisterServiceError } from "@/services/cash-register-service";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ openingBalance: z.number().min(0) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("cash.open");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "الرصيد الافتتاحي غير صالح" }, { status: 400 });
  }

  try {
    const session = await openSession(id, user.id, parsed.data.openingBalance);
    await writeAuditLog({ userId: user.id, action: "CASH_SESSION_OPEN", entityType: "CashRegisterSession", entityId: session.id });
    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    if (e instanceof CashRegisterServiceError) {
      return NextResponse.json({ error: "cash_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
