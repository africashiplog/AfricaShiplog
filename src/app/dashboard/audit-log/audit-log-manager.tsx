"use client";

import { useState } from "react";

interface LogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  user: { fullName: string; fullNameAr: string | null; email: string } | null;
  branch: { nameAr: string } | null;
}

export default function AuditLogManager({ initialLogs }: { initialLogs: LogRow[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function runFilter() {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
    const res = await fetch(`/api/audit-logs?${params.toString()}`);
    const data = await res.json();
    setLoading(false);
    if (res.ok) setLogs(data.logs);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">السجل</h1>
        <p className="text-sm text-slate-500">سجل تدقيق كامل للعمليات الحساسة — تسجيل الدخول، إلغاء التذاكر، الاسترداد، تغييرات الحالة، وغيرها.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">الإجراء</span>
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="مثال: TICKET_CANCEL" dir="ltr" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">من تاريخ</span>
          <input type="date" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">إلى تاريخ</span>
          <input type="date" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button onClick={runFilter} disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {loading ? "جارٍ التحميل..." : "تصفية"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">التاريخ</th>
              <th className="px-4 py-3 text-start font-medium">الإجراء</th>
              <th className="px-4 py-3 text-start font-medium">الكيان</th>
              <th className="px-4 py-3 text-start font-medium">المستخدم</th>
              <th className="px-4 py-3 text-start font-medium">الفرع</th>
              <th className="px-4 py-3 text-start font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="ltr-nums px-4 py-3 text-xs">{new Date(l.createdAt).toLocaleString("ar")}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{l.action}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {l.entityType}
                  {l.entityId && <span className="ltr-nums block font-mono">{l.entityId.slice(0, 12)}…</span>}
                </td>
                <td className="px-4 py-3">{l.user ? (l.user.fullNameAr ?? l.user.fullName) : "النظام"}</td>
                <td className="px-4 py-3">{l.branch?.nameAr ?? "—"}</td>
                <td className="ltr-nums px-4 py-3 text-xs text-slate-400">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  لا توجد سجلات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
