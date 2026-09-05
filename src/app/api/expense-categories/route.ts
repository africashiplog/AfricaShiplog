import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listExpenseCategories } from "@/services/expense-service";

export async function GET() {
  const auth = await requireAuth("expenses.view");
  if (auth instanceof NextResponse) return auth;

  const categories = await listExpenseCategories();
  return NextResponse.json({ categories });
}
