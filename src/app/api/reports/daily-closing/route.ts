import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { getDailyClosingSummary } from "@/services/daily-closing-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("cash.close");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const requestedBranchId = sp.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;
  const date = sp.get("date") ? new Date(sp.get("date")!) : new Date();

  const summary = await getDailyClosingSummary(date, branchId);
  return NextResponse.json({ date: date.toISOString(), summary });
}
