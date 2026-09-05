import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { createExpenseSchema } from "@/lib/validation/expense";
import { listExpenses, createExpense, ExpenseServiceError } from "@/services/expense-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("expenses.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;
  const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
  const expenses = await listExpenses({ branchId, categoryId });
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("expenses.create");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const branchId = user.branchId ?? req.nextUrl.searchParams.get("branchId");
  if (!branchId) return NextResponse.json({ error: "invalid_input", message: "يجب تحديد الفرع" }, { status: 400 });
  if (!userCanAccessBranch(user, branchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك من هذا الفرع" }, { status: 403 });
  }

  try {
    const expense = await createExpense(parsed.data, { userId: user.id, branchId });
    await writeAuditLog({ userId: user.id, action: "EXPENSE_CREATE", entityType: "Expense", entityId: expense.id, branchId, newData: { amount: expense.amount } });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    if (e instanceof ExpenseServiceError) return NextResponse.json({ error: "expense_error", message: e.message }, { status: e.status });
    throw e;
  }
}
