import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { ticketReport } from "@/services/reports-service";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || user.branchId || undefined;
  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;
  const employeeId = sp.get("employeeId") || undefined;
  const destinationBranchId = sp.get("destinationBranchId") || undefined;
  const status = sp.get("status") || undefined;

  const report = await ticketReport({ branchId, dateFrom, dateTo, employeeId, destinationBranchId, status });

  if (sp.get("format") === "csv") {
    const csv = toCsv(report.rows, [
      { key: "ticketNumber", header: "رقم التذكرة" },
      { key: "passengerName", header: "اسم الراكب" },
      { key: "passengerPhone", header: "الهاتف" },
      { key: "origin", header: "المغادرة" },
      { key: "destination", header: "الوجهة" },
      { key: "basePrice", header: "السعر الأساسي" },
      { key: "discount", header: "الخصم" },
      { key: "totalPrice", header: "الإجمالي" },
      { key: "amountPaid", header: "المدفوع" },
      { key: "status", header: "الحالة" },
      { key: "employee", header: "الموظف" },
      { key: "createdAt", header: "التاريخ" },
    ]);
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=tickets-report.csv" },
    });
  }

  return NextResponse.json(report);
}
