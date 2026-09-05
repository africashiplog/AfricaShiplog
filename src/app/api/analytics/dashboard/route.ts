import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getDashboardKpis } from "@/services/analytics-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("analytics.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const branchId = req.nextUrl.searchParams.get("branchId") || user.branchId || undefined;
  const kpis = await getDashboardKpis(branchId);
  return NextResponse.json(kpis);
}
