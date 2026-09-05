import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { getCollectionSummary } from "@/services/accounting-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("expenses.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const requestedBranchId = sp.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;

  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const monthParam = sp.get("month");
  const month = monthParam ? Number(monthParam) : undefined;

  const summary = await getCollectionSummary({ year, month }, branchId);
  return NextResponse.json(summary);
}
