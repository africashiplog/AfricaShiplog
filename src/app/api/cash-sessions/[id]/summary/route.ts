import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { computeSessionSummary, CashRegisterServiceError } from "@/services/cash-register-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("cash.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const summary = await computeSessionSummary(id);
    return NextResponse.json({
      ticketRevenue: summary.ticketRevenue.toString(),
      parcelRevenue: summary.parcelRevenue.toString(),
      codRevenue: summary.codRevenue.toString(),
      expensesTotal: summary.expensesTotal.toString(),
      refundsTotal: summary.refundsTotal.toString(),
      revenueByMethod: summary.revenueByMethod,
      expectedCash: summary.expectedCash.toString(),
    });
  } catch (e) {
    if (e instanceof CashRegisterServiceError) return NextResponse.json({ error: "cash_error", message: e.message }, { status: e.status });
    throw e;
  }
}
