"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

interface BranchRef {
  id: string;
  nameAr: string;
}
interface PaymentMethod {
  id: string;
  nameAr: string;
}
interface RouteRef {
  id: string;
  originBranch: { id: string; nameAr: string };
  destinationBranch: BranchRef;
  pricePerKg: string;
}
interface ParcelRow {
  id: string;
  trackingNumber: string;
  senderName: string;
  recipientName: string;
  status: string;
  originBranch: { nameAr: string };
  destinationBranch: { nameAr: string };
}

const STATUS_AR: Record<string, string> = {
  RECEIVED: "تم الاستلام",
  REGISTERED: "مسجلة",
  PROCESSING: "قيد المعالجة",
  DISPATCHED: "تم الإرسال",
  IN_TRANSIT: "في الطريق",
  ARRIVED: "وصلت إلى الفرع",
  READY_FOR_PICKUP: "جاهزة للاستلام",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغاة",
  RETURNED: "مرتجعة",
  LOST: "مفقودة",
  DAMAGED: "تالفة/مشكلة",
};

const emptyForm = {
  routeId: "",
  senderName: "",
  senderPhone: "",
  senderAddress: "",
  recipientName: "",
  recipientPhone: "",
  recipientAddress: "",
  description: "",
  piecesCount: "1",
  weightKg: "",
  destinationBranchId: "",
  shippingPrice: "",
  discount: "0",
  amountDueOnDelivery: "0",
  amountPaid: "",
  paymentMethodId: "",
};

export default function ParcelsManager({
  initialParcels,
  branches,
  paymentMethods,
  routes,
  canCreate,
}: {
  initialParcels: ParcelRow[];
  branches: BranchRef[];
  paymentMethods: PaymentMethod[];
  routes: RouteRef[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [parcels, setParcels] = useState(initialParcels);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, paymentMethodId: paymentMethods[0]?.id ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectRoute(routeId: string) {
    const route = routes.find((r) => r.id === routeId);
    if (!route) {
      setForm({ ...form, routeId: "" });
      return;
    }
    const weight = Number(form.weightKg) || 0;
    const suggestedPrice = weight > 0 ? (weight * Number(route.pricePerKg)).toFixed(2) : form.shippingPrice;
    setForm({ ...form, routeId, destinationBranchId: route.destinationBranch.id, shippingPrice: suggestedPrice });
  }

  async function runSearch(q: string) {
    setQuery(q);
    const res = await fetch(`/api/parcels?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (res.ok) setParcels(data.parcels);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amountPaid: form.amountPaid || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      router.push(`/dashboard/parcels/${data.parcel.id}`);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">الطرود</h1>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + طرد جديد
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="البحث برقم التتبع أو الاسم أو الهاتف..."
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">رقم التتبع</th>
              <th className="px-4 py-3 text-start font-medium">المرسل</th>
              <th className="px-4 py-3 text-start font-medium">المستلم</th>
              <th className="px-4 py-3 text-start font-medium">المسار</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parcels.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/parcels/${p.id}`} className="ltr-nums font-mono text-xs text-brand hover:underline">
                    {p.trackingNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.senderName}</td>
                <td className="px-4 py-3">{p.recipientName}</td>
                <td className="px-4 py-3">
                  {p.originBranch.nameAr} ← {p.destinationBranch.nameAr}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{STATUS_AR[p.status] ?? p.status}</span>
                </td>
              </tr>
            ))}
            {parcels.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  لا توجد طرود بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">طرد جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-slate-500">المرسل</legend>
                  <Field label="الاسم" value={form.senderName} onChange={(v) => setForm({ ...form, senderName: v })} required />
                  <Field label="الهاتف" value={form.senderPhone} onChange={(v) => setForm({ ...form, senderPhone: v })} dir="ltr" required />
                  <Field label="العنوان" value={form.senderAddress} onChange={(v) => setForm({ ...form, senderAddress: v })} />
                </fieldset>
                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-slate-500">المستلم</legend>
                  <Field label="الاسم" value={form.recipientName} onChange={(v) => setForm({ ...form, recipientName: v })} required />
                  <Field label="الهاتف" value={form.recipientPhone} onChange={(v) => setForm({ ...form, recipientPhone: v })} dir="ltr" required />
                  <Field label="العنوان" value={form.recipientAddress} onChange={(v) => setForm({ ...form, recipientAddress: v })} />
                </fieldset>
              </div>

              {routes.length > 0 && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">الخط (اختياري — يملأ الوجهة وسعر الشحن تلقائيًا حسب الوزن)</span>
                  <select
                    value={form.routeId}
                    onChange={(e) => selectRoute(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">— اختيار يدوي —</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.originBranch.nameAr} ← {r.destinationBranch.nameAr} ({formatMoney(r.pricePerKg)}/كغ)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">فرع الوجهة</span>
                  <select
                    required
                    value={form.destinationBranchId}
                    onChange={(e) => setForm({ ...form, destinationBranchId: e.target.value, routeId: "" })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">—</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="عدد القطع" value={form.piecesCount} onChange={(v) => setForm({ ...form, piecesCount: v })} dir="ltr" type="number" />
                <Field
                  label="الوزن (كجم)"
                  value={form.weightKg}
                  onChange={(v) => {
                    const route = routes.find((r) => r.id === form.routeId);
                    const weight = Number(v) || 0;
                    const suggestedPrice = route && weight > 0 ? (weight * Number(route.pricePerKg)).toFixed(2) : form.shippingPrice;
                    setForm({ ...form, weightKg: v, shippingPrice: suggestedPrice });
                  }}
                  dir="ltr"
                  type="number"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="سعر الشحن" value={form.shippingPrice} onChange={(v) => setForm({ ...form, shippingPrice: v })} dir="ltr" type="number" required />
                <Field label="الخصم" value={form.discount} onChange={(v) => setForm({ ...form, discount: v })} dir="ltr" type="number" />
                <Field label="المستحق عند التسليم" value={form.amountDueOnDelivery} onChange={(v) => setForm({ ...form, amountDueOnDelivery: v })} dir="ltr" type="number" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="المبلغ المدفوع الآن (رسوم الشحن)" value={form.amountPaid} onChange={(v) => setForm({ ...form, amountPaid: v })} dir="ltr" type="number" />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">طريقة الدفع</span>
                  <select
                    value={form.paymentMethodId}
                    onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {paymentMethods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameAr}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Field label="الوصف / ملاحظات" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

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
