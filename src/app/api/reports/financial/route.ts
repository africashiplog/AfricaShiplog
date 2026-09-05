import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { financialReport } from "@/services/reports-service";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || user.branchId || undefined;
  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;
  const type = sp.get("type") || undefined;
  const paymentMethodId = sp.get("paymentMethodId") || undefined;

  const report = await financialReport({ branchId, dateFrom, dateTo, type, paymentMethodId });

  if (sp.get("format") === "csv") {
    const csv = toCsv(report.rows, [
      { key: "referenceNumber", header: "الرقم المرجعي" },
      { key: "type", header: "النوع" },
      { key: "amount", header: "المبلغ" },
      { key: "paymentMethod", header: "طريقة الدفع" },
      { key: "branch", header: "الفرع" },
      { key: "user", header: "الموظف" },
      { key: "occurredAt", header: "التاريخ" },
      { key: "notes", header: "ملاحظات" },
    ]);
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=financial-report.csv" },
    });
  }

  return NextResponse.json(report);
}
