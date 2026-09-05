import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { voidExpenseSchema } from "@/lib/validation/expense";
import { voidExpense, ExpenseServiceError } from "@/services/expense-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("expenses.approve");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = voidExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const expense = await voidExpense(id, parsed.data.reason, user.id);
    await writeAuditLog({ userId: user.id, action: "EXPENSE_VOID", entityType: "Expense", entityId: id, newData: { reason: parsed.data.reason } });
    return NextResponse.json({ expense });
  } catch (e) {
    if (e instanceof ExpenseServiceError) return NextResponse.json({ error: "expense_error", message: e.message }, { status: e.status });
    throw e;
  }
}
