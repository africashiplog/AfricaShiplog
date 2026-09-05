"use client";

import { useState } from "react";

type Tab = "tickets" | "parcels" | "financial";

const TAB_LABELS: Record<Tab, string> = { tickets: "التذاكر", parcels: "الطرود", financial: "المالية" };

export default function ReportsManager() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<{ rows: Record<string, unknown>[]; summary: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(false);

  function buildQuery() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
    if (status) params.set("status", status);
    return params;
  }

  async function runReport() {
    setLoading(true);
    const params = buildQuery();
    const res = await fetch(`/api/reports/${tab}?${params.toString()}`);
    const json = await res.json();
    setLoading(false);
    if (res.ok) setData(json);
  }

  function exportCsv() {
    const params = buildQuery();
    params.set("format", "csv");
    window.open(`/api/reports/${tab}?${params.toString()}`, "_blank");
  }

  const columns = COLUMN_DEFS[tab];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">التقارير</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setData(null);
            }}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">من تاريخ</span>
          <input type="date" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">إلى تاريخ</span>
          <input type="date" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">الحالة</span>
          <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="اختياري" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button onClick={runReport} disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {loading ? "جارٍ التحميل..." : "عرض التقرير"}
        </button>
        {data && (
          <>
            <button onClick={exportCsv} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              تصدير Excel/CSV
            </button>
            <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              طباعة / PDF
            </button>
          </>
        )}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(data.summary).map(([k, v]) =>
              typeof v === "object" ? null : (
                <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <p className="ltr-nums text-lg font-bold text-brand-dark">{String(v)}</p>
                  <p className="mt-1 text-xs text-slate-500">{k}</p>
                </div>
              )
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 text-start font-medium">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className="ltr-nums px-3 py-2">
                        {String(row[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const COLUMN_DEFS: Record<Tab, { key: string; header: string }[]> = {
  tickets: [
    { key: "ticketNumber", header: "رقم التذكرة" },
    { key: "passengerName", header: "الراكب" },
    { key: "destination", header: "الوجهة" },
    { key: "totalPrice", header: "الإجمالي" },
    { key: "amountPaid", header: "المدفوع" },
    { key: "status", header: "الحالة" },
    { key: "employee", header: "الموظف" },
  ],
  parcels: [
    { key: "trackingNumber", header: "رقم التتبع" },
    { key: "sender", header: "المرسل" },
    { key: "recipient", header: "المستلم" },
    { key: "destination", header: "الوجهة" },
    { key: "shippingPrice", header: "سعر الشحن" },
    { key: "status", header: "الحالة" },
  ],
  financial: [
    { key: "referenceNumber", header: "الرقم المرجعي" },
    { key: "type", header: "النوع" },
    { key: "amount", header: "المبلغ" },
    { key: "paymentMethod", header: "طريقة الدفع" },
    { key: "branch", header: "الفرع" },
    { key: "occurredAt", header: "التاريخ" },
  ],
};
