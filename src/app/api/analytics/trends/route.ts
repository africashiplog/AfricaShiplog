import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getRevenueExpenseTrend, getBranchRevenue, getDestinationRevenue, getVolumeTrend } from "@/services/analytics-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("analytics.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const branchId = req.nextUrl.searchParams.get("branchId") || user.branchId || undefined;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "14");

  const [revenueExpenseTrend, volumeTrend, branchRevenue, destinationRevenue] = await Promise.all([
    getRevenueExpenseTrend(days, branchId),
    getVolumeTrend(days, branchId),
    getBranchRevenue(),
    getDestinationRevenue(),
  ]);

  return NextResponse.json({ revenueExpenseTrend, volumeTrend, branchRevenue, destinationRevenue });
}
