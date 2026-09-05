"use client";

import { useEffect, useState } from "react";
import { formatMoney, formatNumber } from "@/lib/format";

interface Summary {
  periodLabel: string;
  ticketRevenue: string;
  parcelRevenue: string;
  totalRevenue: string;
  expensesTotal: string;
  netResult: string;
  marginPercent: string;
  expensesByCategory: { categoryNameAr: string; amount: string; count: number }[];
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function CollectionSummaryTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "">(now.getMonth() + 1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ year: String(year) });
      if (month !== "") params.set("month", String(month));
      const res = await fetch(`/api/accounting/collection-summary?${params.toString()}`);
      const data = await res.json();
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">السنة</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2" dir="ltr">
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">الشهر</span>
          <select value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">السنة كاملة</option>
            {MONTHS_AR.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading || !summary ? (
        <p className="py-8 text-center text-slate-400">جارٍ التحميل...</p>
      ) : (
        <>
          <p className="font-semibold text-slate-700">الحصيلة — {summary.periodLabel}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className={`ltr-nums text-xl font-bold ${Number(summary.netResult) >= 0 ? "text-emerald-600" : "text-danger"}`}>
                {formatMoney(summary.netResult)}
              </p>
              <p className="mt-1 text-xs text-slate-500">النتيجة الصافية</p>
              <p className="ltr-nums mt-1 text-xs text-slate-400">الهامش الصافي: {summary.marginPercent}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="ltr-nums text-xl font-bold text-danger">{formatMoney(summary.expensesTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">إجمالي المصاريف</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="ltr-nums text-xl font-bold text-brand-dark">{formatMoney(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-slate-500">
                إجمالي المداخيل
                <span className="block ltr-nums">تذاكر {formatNumber(summary.ticketRevenue)} · طرود {formatNumber(summary.parcelRevenue)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-slate-800">توزيع المصاريف حسب الفئة</h3>
            {summary.expensesByCategory.length === 0 ? (
              <p className="text-sm text-slate-400">لا توجد مصاريف في هذه الفترة.</p>
            ) : (
              <table className="w-full text-start text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">الفئة</th>
                    <th className="px-3 py-2 text-start font-medium">العدد</th>
                    <th className="px-3 py-2 text-start font-medium">المبلغ</th>
                    <th className="px-3 py-2 text-start font-medium">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.expensesByCategory.map((c) => (
                    <tr key={c.categoryNameAr}>
                      <td className="px-3 py-2">{c.categoryNameAr}</td>
                      <td className="ltr-nums px-3 py-2">{c.count}</td>
                      <td className="ltr-nums px-3 py-2">{formatMoney(c.amount)}</td>
                      <td className="ltr-nums px-3 py-2">
                        {summary.expensesTotal !== "0" ? ((Number(c.amount) / Number(summary.expensesTotal)) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
