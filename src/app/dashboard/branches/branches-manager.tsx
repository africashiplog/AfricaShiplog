"use client";

import { useState } from "react";

interface Branch {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  city: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  isActive: boolean;
}

const emptyForm = { code: "", name: "", nameAr: "", city: "", phone: "", whatsappPhone: "", email: "" };

export default function BranchesManager({ initialBranches, canManage }: { initialBranches: Branch[]; canManage: boolean }) {
  const [branches, setBranches] = useState(initialBranches);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setForm({
      code: b.code,
      name: b.name,
      nameAr: b.nameAr,
      city: b.city ?? "",
      phone: b.phone ?? "",
      whatsappPhone: b.whatsappPhone ?? "",
      email: b.email ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId ? `/api/branches/${editingId}` : "/api/branches";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      if (editingId) {
        setBranches((prev) => prev.map((b) => (b.id === editingId ? data.branch : b)));
      } else {
        setBranches((prev) => [...prev, data.branch].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowForm(false);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("هل تريد أرشفة هذا الفرع؟")) return;
    const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر أرشفة الفرع");
      return;
    }
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: false } : b)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">الفروع</h1>
        {canManage && (
          <button
            onClick={startCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + فرع جديد
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الرمز</th>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">المدينة</th>
              <th className="px-4 py-3 text-start font-medium">الهاتف</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              {canManage && <th className="px-4 py-3 text-start font-medium">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((b) => (
              <tr key={b.id}>
                <td className="ltr-nums px-4 py-3 font-mono text-xs text-slate-600">{b.code}</td>
                <td className="px-4 py-3">{b.nameAr}</td>
                <td className="px-4 py-3">{b.city ?? "—"}</td>
                <td className="ltr-nums px-4 py-3">{b.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {b.isActive ? "نشط" : "معطل"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(b)} className="text-sm text-brand hover:underline">
                        تعديل
                      </button>
                      {b.isActive && (
                        <button onClick={() => handleArchive(b.id)} className="text-sm text-danger hover:underline">
                          أرشفة
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  لا توجد فروع بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {editingId ? "تعديل الفرع" : "فرع جديد"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="الرمز" value={form.code} onChange={(v) => setForm({ ...form, code: v })} dir="ltr" required disabled={!!editingId} />
                <Field label="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              </div>
              <Field label="الاسم (عربي)" value={form.nameAr} onChange={(v) => setForm({ ...form, nameAr: v })} required />
              <Field label="الاسم (إنجليزي)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} dir="ltr" required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} dir="ltr" />
                <Field label="واتساب" value={form.whatsappPhone} onChange={(v) => setForm({ ...form, whatsappPhone: v })} dir="ltr" />
              </div>
              <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => setForm({ ...form, email: v })} dir="ltr" />

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  إلغاء
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                  {submitting ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
