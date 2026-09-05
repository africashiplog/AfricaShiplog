import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { listAuditLogs } from "@/services/audit-log-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("audit.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const requestedBranchId = sp.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;
  const action = sp.get("action") || undefined;
  const entityType = sp.get("entityType") || undefined;
  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;

  const logs = await listAuditLogs({ branchId, action, entityType, dateFrom, dateTo });
  return NextResponse.json({ logs });
}
