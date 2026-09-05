"use client";

import { useState } from "react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string;
  secondaryPhone: string | null;
  address: string | null;
  type: "INDIVIDUAL" | "BUSINESS";
}

interface CustomerFormState {
  name: string;
  phone: string;
  secondaryPhone: string;
  address: string;
  notes: string;
  type: "INDIVIDUAL" | "BUSINESS";
}

const emptyForm: CustomerFormState = { name: "", phone: "", secondaryPhone: "", address: "", notes: "", type: "INDIVIDUAL" };

export default function CustomersManager({ initialCustomers, canCreate, canEdit }: { initialCustomers: Customer[]; canCreate: boolean; canEdit: boolean }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function runSearch(q: string) {
    setQuery(q);
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) setCustomers(data.customers);
    } finally {
      setSearching(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, secondaryPhone: c.secondaryPhone ?? "", address: c.address ?? "", notes: "", type: c.type });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      if (editingId) {
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? data.customer : c)));
      } else {
        setCustomers((prev) => [data.customer, ...prev]);
      }
      setShowForm(false);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">العملاء</h1>
        {canCreate && (
          <button onClick={startCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + عميل جديد
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="البحث بالاسم أو رقم الهاتف..."
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">الهاتف</th>
              <th className="px-4 py-3 text-start font-medium">النوع</th>
              <th className="px-4 py-3 text-start font-medium">العنوان</th>
              <th className="px-4 py-3 text-start font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/customers/${c.id}`} className="text-brand hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="ltr-nums px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.type === "BUSINESS" ? "شركة" : "فرد"}</td>
                <td className="px-4 py-3">{c.address ?? "—"}</td>
                <td className="px-4 py-3">
                  {canEdit && (
                    <button onClick={() => startEdit(c)} className="text-sm text-brand hover:underline">
                      تعديل
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && !searching && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editingId ? "تعديل العميل" : "عميل جديد"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} dir="ltr" required />
                <Field label="هاتف إضافي" value={form.secondaryPhone} onChange={(v) => setForm({ ...form, secondaryPhone: v })} dir="ltr" />
              </div>
              <Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">النوع</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "INDIVIDUAL" | "BUSINESS" })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="INDIVIDUAL">فرد</option>
                  <option value="BUSINESS">شركة</option>
                </select>
              </label>

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
