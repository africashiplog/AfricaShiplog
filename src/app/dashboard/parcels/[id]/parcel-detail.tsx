"use client";

import { useState } from "react";
import Link from "next/link";

interface StatusHistoryRow {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: string;
}
interface PaymentMethod {
  id: string;
  nameAr: string;
}
interface ParcelDetail {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  status: string;
  piecesCount: number;
  totalShippingPrice: string;
  amountDueOnDelivery: string;
  originBranch: { nameAr: string };
  destinationBranch: { nameAr: string };
  statusHistory: StatusHistoryRow[];
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

const NEXT_STATUSES: Record<string, string[]> = {
  RECEIVED: ["REGISTERED", "PROCESSING", "DAMAGED"],
  REGISTERED: ["PROCESSING", "DISPATCHED", "DAMAGED"],
  PROCESSING: ["DISPATCHED", "DAMAGED"],
  DISPATCHED: ["IN_TRANSIT", "LOST"],
  IN_TRANSIT: ["ARRIVED", "LOST", "DAMAGED"],
  ARRIVED: ["READY_FOR_PICKUP", "DAMAGED"],
  READY_FOR_PICKUP: ["RETURNED"],
};

const TERMINAL = new Set(["DELIVERED", "CANCELLED", "RETURNED", "LOST"]);

export default function ParcelDetailClient({
  initialParcel,
  paymentMethods,
  canEdit,
  canDeliver,
  canCancel,
}: {
  initialParcel: ParcelDetail;
  paymentMethods: PaymentMethod[];
  canEdit: boolean;
  canDeliver: boolean;
  canCancel: boolean;
}) {
  const [parcel, setParcel] = useState(initialParcel);
  const [error, setError] = useState<string | null>(null);
  const [showDeliverForm, setShowDeliverForm] = useState(false);
  const [deliverForm, setDeliverForm] = useState({
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    amountCollected: parcel.amountDueOnDelivery,
    paymentMethodId: paymentMethods[0]?.id ?? "",
  });

  async function refresh() {
    const res = await fetch(`/api/parcels/${parcel.id}`);
    if (res.ok) {
      const data = await res.json();
      setParcel(JSON.parse(JSON.stringify(data.parcel)));
    }
  }

  async function changeStatus(newStatus: string) {
    setError(null);
    const note = prompt("ملاحظة (اختياري):") ?? "";
    const res = await fetch(`/api/parcels/${parcel.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "تعذر تحديث الحالة");
      return;
    }
    await refresh();
  }

  async function handleDeliver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/parcels/${parcel.id}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deliverForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "تعذر تسجيل التسليم");
      return;
    }
    setShowDeliverForm(false);
    await refresh();
  }

  async function handleCancel() {
    const reason = prompt("سبب الإلغاء:");
    if (!reason) return;
    const res = await fetch(`/api/parcels/${parcel.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر الإلغاء");
      return;
    }
    await refresh();
  }

  const nextOptions = NEXT_STATUSES[parcel.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ltr-nums text-xl font-bold text-slate-900">{parcel.trackingNumber}</h1>
          <p className="text-sm text-slate-500">
            {parcel.originBranch.nameAr} ← {parcel.destinationBranch.nameAr}
          </p>
        </div>
        <Link href={`/print/parcels/${parcel.id}/label`} target="_blank" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          طباعة الملصق
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="الحالة" value={STATUS_AR[parcel.status] ?? parcel.status} />
        <StatCard label="عدد القطع" value={parcel.piecesCount} />
        <StatCard label="سعر الشحن" value={parcel.totalShippingPrice} />
        <StatCard label="المستحق عند التسليم" value={parcel.amountDueOnDelivery} />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      {canEdit && !TERMINAL.has(parcel.status) && nextOptions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-800">تحديث الحالة</h2>
          <div className="flex flex-wrap gap-2">
            {nextOptions.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
              >
                {STATUS_AR[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {canDeliver && (parcel.status === "READY_FOR_PICKUP" || parcel.status === "ARRIVED") && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">تسليم الطرد</h2>
            {!showDeliverForm && (
              <button onClick={() => setShowDeliverForm(true)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                تسجيل التسليم
              </button>
            )}
          </div>
          {showDeliverForm && (
            <form onSubmit={handleDeliver} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="اسم المستلم" value={deliverForm.recipientName} onChange={(v) => setDeliverForm({ ...deliverForm, recipientName: v })} required />
                <Field label="هاتف المستلم" value={deliverForm.recipientPhone} onChange={(v) => setDeliverForm({ ...deliverForm, recipientPhone: v })} dir="ltr" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="المبلغ المحصل" value={deliverForm.amountCollected} onChange={(v) => setDeliverForm({ ...deliverForm, amountCollected: v })} dir="ltr" type="number" />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">طريقة الدفع</span>
                  <select
                    value={deliverForm.paymentMethodId}
                    onChange={(e) => setDeliverForm({ ...deliverForm, paymentMethodId: e.target.value })}
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
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDeliverForm(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  إلغاء
                </button>
                <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  تأكيد التسليم
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {canCancel && ["RECEIVED", "REGISTERED", "PROCESSING"].includes(parcel.status) && (
        <button onClick={handleCancel} className="text-sm text-danger hover:underline">
          إلغاء الطرد
        </button>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">سجل التتبع</h2>
        <ul className="space-y-2 text-sm">
          {parcel.statusHistory.map((h) => (
            <li key={h.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span>{STATUS_AR[h.newStatus] ?? h.newStatus}</span>
              <span className="ltr-nums text-xs text-slate-400">{new Date(h.createdAt).toLocaleString("ar")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="ltr-nums text-lg font-bold text-brand-dark">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
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
