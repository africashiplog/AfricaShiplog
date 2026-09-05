"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

interface Row {
  tripId: string;
  tripNumber: string;
  departureDate: string;
  originBranchNameAr: string;
  destinationBranchNameAr: string;
  ticketRevenue: string;
  linkedExpenses: string;
  netResult: string;
}

export default function TripProfitabilityTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/accounting/trip-profitability");
      const data = await res.json();
      if (!cancelled) {
        setRows(data.rows ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        الربحية هنا = مداخيل التذاكر ناقص المصاريف المرتبطة صراحةً بالرحلة (مثل الوقود عند تسجيله بربطه بالرحلة). المصاريف غير المرتبطة بأي رحلة لا تُحتسب هنا.
      </p>
      {loading ? (
        <p className="py-8 text-center text-slate-400">جارٍ التحميل...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">رقم الرحلة</th>
                <th className="px-3 py-2 text-start font-medium">المسار</th>
                <th className="px-3 py-2 text-start font-medium">تاريخ المغادرة</th>
                <th className="px-3 py-2 text-start font-medium">مداخيل التذاكر</th>
                <th className="px-3 py-2 text-start font-medium">المصاريف المرتبطة</th>
                <th className="px-3 py-2 text-start font-medium">صافي النتيجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.tripId}>
                  <td className="ltr-nums px-3 py-2 font-mono text-xs">{r.tripNumber}</td>
                  <td className="px-3 py-2">
                    {r.originBranchNameAr} ← {r.destinationBranchNameAr}
                  </td>
                  <td className="ltr-nums px-3 py-2 text-xs">{new Date(r.departureDate).toLocaleDateString("ar")}</td>
                  <td className="ltr-nums px-3 py-2">{formatMoney(r.ticketRevenue)}</td>
                  <td className="ltr-nums px-3 py-2">{formatMoney(r.linkedExpenses)}</td>
                  <td className={`ltr-nums px-3 py-2 font-semibold ${Number(r.netResult) >= 0 ? "text-emerald-600" : "text-danger"}`}>
                    {formatMoney(r.netResult)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    لا توجد رحلات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
