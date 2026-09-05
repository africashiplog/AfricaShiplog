"use client";

import { useState } from "react";
import { formatMoney, formatNumber } from "@/lib/format";

interface BranchRef {
  id: string;
  nameAr: string;
}

interface RouteRow {
  id: string;
  distanceKm: string;
  pricePerPassenger: string;
  pricePerKg: string;
  isActive: boolean;
  originBranch: BranchRef;
  destinationBranch: BranchRef;
}

const emptyForm = { originBranchId: "", destinationBranchId: "", distanceKm: "", pricePerPassenger: "", pricePerKg: "" };

export default function RoutesManager({ initialRoutes, branches, canManage }: { initialRoutes: RouteRow[]; branches: BranchRef[]; canManage: boolean }) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.message ?? "تعذر إنشاء الخط");
      return;
    }
    setRoutes((prev) => [...prev, data.route].sort((a, b) => a.originBranch.nameAr.localeCompare(b.originBranch.nameAr)));
    setForm(emptyForm);
  }

  async function handleArchive(id: string) {
    if (!confirm("هل تريد إلغاء تفعيل هذا الخط؟")) return;
    const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: false } : r)));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">الخطوط الموجودة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-2">المسار</th>
                <th className="px-2 py-2">المسافة (كم)</th>
                <th className="px-2 py-2">سعر المسافر</th>
                <th className="px-2 py-2">سعر الطرد/كغ</th>
                <th className="px-2 py-2">الحالة</th>
                {canManage && <th className="px-2 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    {r.originBranch.nameAr} → {r.destinationBranch.nameAr}
                  </td>
                  <td className="px-2 py-2">{formatNumber(r.distanceKm)}</td>
                  <td className="px-2 py-2">{formatMoney(r.pricePerPassenger)}</td>
                  <td className="px-2 py-2">{formatMoney(r.pricePerKg)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-2 py-2">
                      {r.isActive && (
                        <button onClick={() => handleArchive(r.id)} className="text-xs text-rose-600 hover:underline">
                          إلغاء التفعيل
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-2 py-6 text-center text-slate-400">
                    لا توجد خطوط بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
        <div className="h-fit rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-800">خط جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">مدينة المغادرة</span>
              <select
                required
                value={form.originBranchId}
                onChange={(e) => setForm({ ...form, originBranchId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">مدينة الوصول</span>
              <select
                required
                value={form.destinationBranchId}
                onChange={(e) => setForm({ ...form, destinationBranchId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">المسافة (كم)</span>
              <input
                required
                type="number"
                min="0"
                step="0.1"
                value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">سعر المسافر (أوقية)</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.pricePerPassenger}
                onChange={(e) => setForm({ ...form, pricePerPassenger: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">سعر الطرد/كغ (أوقية)</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.pricePerKg}
                onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {submitting ? "جارٍ الحفظ..." : "إضافة الخط"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
