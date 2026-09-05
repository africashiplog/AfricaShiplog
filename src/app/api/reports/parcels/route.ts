import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { parcelReport } from "@/services/reports-service";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const requestedBranchId = sp.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;
  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;
  const status = sp.get("status") || undefined;

  const report = await parcelReport({ branchId, dateFrom, dateTo, status });

  if (sp.get("format") === "csv") {
    const csv = toCsv(report.rows, [
      { key: "trackingNumber", header: "رقم التتبع" },
      { key: "sender", header: "المرسل" },
      { key: "recipient", header: "المستلم" },
      { key: "origin", header: "الفرع الأصل" },
      { key: "destination", header: "فرع الوجهة" },
      { key: "status", header: "الحالة" },
      { key: "shippingPrice", header: "سعر الشحن" },
      { key: "amountDueOnDelivery", header: "المستحق عند التسليم" },
      { key: "createdAt", header: "تاريخ الإنشاء" },
      { key: "deliveredAt", header: "تاريخ التسليم" },
    ]);
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=parcels-report.csv" },
    });
  }

  return NextResponse.json(report);
}
