"use client";

import { useState } from "react";

interface Settings {
  nameAr: string;
  name: string | null;
  currency: string;
  timezone: string;
}

export default function AgencyManager({ initialSettings, canManage }: { initialSettings: Settings; canManage: boolean }) {
  const [form, setForm] = useState({ nameAr: initialSettings.nameAr, name: initialSettings.name ?? "", currency: initialSettings.currency, timezone: initialSettings.timezone });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/agency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.message ?? "تعذر الحفظ");
      return;
    }
    setMessage("تم الحفظ بنجاح");
  }

  return (
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 font-semibold text-slate-800">بيانات الوكالة</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">اسم الوكالة (عربي)</span>
          <input
            required
            disabled={!canManage}
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">اسم الوكالة (إنجليزي)</span>
          <input
            dir="ltr"
            disabled={!canManage}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">العملة</span>
            <input
              dir="ltr"
              required
              disabled={!canManage}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">المنطقة الزمنية</span>
            <input
              dir="ltr"
              required
              disabled={!canManage}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
        </div>

        {message && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</p>}

        {canManage && (
          <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        )}
      </form>
    </div>
  );
}
