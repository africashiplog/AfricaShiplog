"use client";

import { useState } from "react";
import { formatMoney, formatNumber } from "@/lib/format";

interface EmployeeSummary {
  userId: string;
  fullName: string;
  fullNameAr: string | null;
  email: string;
  ticketsCount: number;
  seatsCount: number;
  ticketRevenue: string;
  parcelsCount: number;
  parcelRevenue: string;
  cancelledCount: number;
  totalCollected: string;
}

function todayLocalDate() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default function DailyClosingManager({ initialSummary, initialDate }: { initialSummary: EmployeeSummary[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate || todayLocalDate());
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);

  async function loadDate(d: string) {
    setDate(d);
    setLoading(true);
    const res = await fetch(`/api/reports/daily-closing?date=${d}`);
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSummary(data.summary);
  }

  const totals = summary.reduce(
    (acc, r) => ({
      ticketsCount: acc.ticketsCount + r.ticketsCount,
      seatsCount: acc.seatsCount + r.seatsCount,
      ticketRevenue: acc.ticketRevenue + Number(r.ticketRevenue),
      parcelsCount: acc.parcelsCount + r.parcelsCount,
      parcelRevenue: acc.parcelRevenue + Number(r.parcelRevenue),
      cancelledCount: acc.cancelledCount + r.cancelledCount,
      totalCollected: acc.totalCollected + Number(r.totalCollected),
    }),
    { ticketsCount: 0, seatsCount: 0, ticketRevenue: 0, parcelsCount: 0, parcelRevenue: 0, cancelledCount: 0, totalCollected: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => window.print()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          طباعة
        </button>
        <input type="date" dir="ltr" value={date} onChange={(e) => loadDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">إغلاق الصندوق</h1>
        <p className="text-sm text-slate-500">ملخّص المقبوضات حسب الموظف</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 ltr-nums text-sm font-medium text-slate-600">يوم {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
        {loading ? (
          <p className="py-8 text-center text-slate-400">جارٍ التحميل...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">الموظف</th>
                  <th className="px-3 py-2 text-start font-medium">التذاكر</th>
                  <th className="px-3 py-2 text-start font-medium">المقاعد</th>
                  <th className="px-3 py-2 text-start font-medium">مداخيل التذاكر</th>
                  <th className="px-3 py-2 text-start font-medium">الطرود</th>
                  <th className="px-3 py-2 text-start font-medium">مداخيل الطرود</th>
                  <th className="px-3 py-2 text-start font-medium">الملغاة</th>
                  <th className="px-3 py-2 text-start font-medium">إجمالي المقبوض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((r) => (
                  <tr key={r.userId}>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800">{r.fullNameAr ?? r.fullName}</span>
                      <span className="block text-xs text-slate-400">{r.email}</span>
                    </td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(r.ticketsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(r.seatsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatMoney(r.ticketRevenue)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(r.parcelsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatMoney(r.parcelRevenue)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(r.cancelledCount)}</td>
                    <td className="ltr-nums px-3 py-2 font-semibold">{formatMoney(r.totalCollected)}</td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                      لا توجد عمليات في هذا اليوم
                    </td>
                  </tr>
                )}
              </tbody>
              {summary.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 font-bold">
                  <tr>
                    <td className="px-3 py-2">المجموع</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(totals.ticketsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(totals.seatsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatMoney(totals.ticketRevenue)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(totals.parcelsCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatMoney(totals.parcelRevenue)}</td>
                    <td className="ltr-nums px-3 py-2">{formatNumber(totals.cancelledCount)}</td>
                    <td className="ltr-nums px-3 py-2">{formatMoney(totals.totalCollected)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
