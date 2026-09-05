"use client";

import { useState } from "react";

interface Category {
  id: string;
  nameAr: string;
}
interface PaymentMethod {
  id: string;
  nameAr: string;
}
interface TripRef {
  id: string;
  tripNumber: string;
}
interface ExpenseRow {
  id: string;
  amount: string;
  description: string;
  occurredAt: string;
  voidedAt: string | null;
  category: { nameAr: string };
  paymentMethod: { nameAr: string };
  user: { fullNameAr: string | null; fullName: string };
  trip: TripRef | null;
}

const emptyForm = { categoryId: "", amount: "", paymentMethodId: "", description: "", referenceNumber: "", tripId: "" };

export default function ExpensesManager({
  initialExpenses,
  categories,
  paymentMethods,
  trips,
  canCreate,
  canApprove,
}: {
  initialExpenses: ExpenseRow[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  trips: TripRef[];
  canCreate: boolean;
  canApprove: boolean;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, categoryId: categories[0]?.id ?? "", paymentMethodId: paymentMethods[0]?.id ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      setExpenses((prev) => [data.expense, ...prev]);
      setShowForm(false);
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "", paymentMethodId: paymentMethods[0]?.id ?? "" });
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoid(id: string) {
    const reason = prompt("سبب الإبطال:");
    if (!reason) return;
    const res = await fetch(`/api/expenses/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر الإبطال");
      return;
    }
    setExpenses((prev) => prev.map((e) => (e.id === id ? data.expense : e)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">المصروفات</h1>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + مصروف جديد
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">التاريخ</th>
              <th className="px-4 py-3 text-start font-medium">الفئة</th>
              <th className="px-4 py-3 text-start font-medium">الوصف</th>
              <th className="px-4 py-3 text-start font-medium">المبلغ</th>
              <th className="px-4 py-3 text-start font-medium">طريقة الدفع</th>
              <th className="px-4 py-3 text-start font-medium">الموظف</th>
              <th className="px-4 py-3 text-start font-medium">الرحلة</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              {canApprove && <th className="px-4 py-3 text-start font-medium">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id} className={e.voidedAt ? "opacity-50" : ""}>
                <td className="ltr-nums px-4 py-3">{new Date(e.occurredAt).toLocaleDateString("ar")}</td>
                <td className="px-4 py-3">{e.category.nameAr}</td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="ltr-nums px-4 py-3">{e.amount}</td>
                <td className="px-4 py-3">{e.paymentMethod.nameAr}</td>
                <td className="px-4 py-3">{e.user.fullNameAr ?? e.user.fullName}</td>
                <td className="ltr-nums px-4 py-3 text-xs">{e.trip?.tripNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.voidedAt ? "bg-slate-200 text-slate-600" : "bg-green-100 text-green-700"}`}>
                    {e.voidedAt ? "مبطل" : "سارٍ"}
                  </span>
                </td>
                {canApprove && (
                  <td className="px-4 py-3">
                    {!e.voidedAt && (
                      <button onClick={() => handleVoid(e.id)} className="text-sm text-danger hover:underline">
                        إبطال
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  لا توجد مصروفات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">مصروف جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">الفئة</span>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="المبلغ" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} dir="ltr" type="number" required />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">طريقة الدفع</span>
                <select value={form.paymentMethodId} onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="الوصف" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required />
              <Field label="رقم مرجعي (اختياري)" value={form.referenceNumber} onChange={(v) => setForm({ ...form, referenceNumber: v })} dir="ltr" />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">الرحلة المرتبطة (اختياري)</span>
                <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="">— مصروف متنوّع (غير مرتبط) —</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripNumber}
                    </option>
                  ))}
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
