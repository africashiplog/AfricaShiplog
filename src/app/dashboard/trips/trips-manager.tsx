"use client";

import { useState } from "react";
import Link from "next/link";

interface BranchRef {
  id: string;
  nameAr: string;
}
interface VehicleRef {
  id: string;
  plateNumber: string;
}
interface DriverRef {
  id: string;
  name: string;
}
interface Trip {
  id: string;
  tripNumber: string;
  departureDate: string;
  seatCapacity: number;
  basePrice: string;
  status: string;
  originBranch: BranchRef;
  destinationBranch: BranchRef;
  vehicle: VehicleRef | null;
  driver: DriverRef | null;
  _count: { tickets: number };
}

const STATUS_AR: Record<string, string> = {
  SCHEDULED: "مجدولة",
  BOARDING: "الصعود جارٍ",
  DEPARTED: "غادرت",
  ARRIVED: "وصلت",
  CANCELLED: "ملغاة",
};

const emptyForm = {
  originBranchId: "",
  destinationBranchId: "",
  departureDate: "",
  seatCapacity: "45",
  basePrice: "",
  vehicleId: "",
  driverId: "",
};

export default function TripsManager({
  initialTrips,
  branches,
  vehicles,
  drivers,
  canCreate,
}: {
  initialTrips: Trip[];
  branches: BranchRef[];
  vehicles: VehicleRef[];
  drivers: DriverRef[];
  canCreate: boolean;
}) {
  const [trips, setTrips] = useState(initialTrips);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vehicleId: form.vehicleId || null,
          driverId: form.driverId || null,
          departureDate: new Date(form.departureDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      setTrips((prev) => [...prev, data.trip].sort((a, b) => a.departureDate.localeCompare(b.departureDate)));
      setShowForm(false);
      setForm(emptyForm);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">الرحلات</h1>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + رحلة جديدة
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">رقم الرحلة</th>
              <th className="px-4 py-3 text-start font-medium">المسار</th>
              <th className="px-4 py-3 text-start font-medium">المغادرة</th>
              <th className="px-4 py-3 text-start font-medium">السعر</th>
              <th className="px-4 py-3 text-start font-medium">التذاكر المباعة</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/trips/${t.id}`} className="ltr-nums font-mono text-xs text-brand hover:underline">
                    {t.tripNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {t.originBranch.nameAr} ← {t.destinationBranch.nameAr}
                </td>
                <td className="ltr-nums px-4 py-3">{new Date(t.departureDate).toLocaleString("ar")}</td>
                <td className="ltr-nums px-4 py-3">{t.basePrice}</td>
                <td className="ltr-nums px-4 py-3">
                  {t._count.tickets} / {t.seatCapacity}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{STATUS_AR[t.status] ?? t.status}</span>
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  لا توجد رحلات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">رحلة جديدة</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="فرع المغادرة" value={form.originBranchId} onChange={(v) => setForm({ ...form, originBranchId: v })} options={branches} required />
                <SelectField label="فرع الوجهة" value={form.destinationBranchId} onChange={(v) => setForm({ ...form, destinationBranchId: v })} options={branches} required />
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">تاريخ ووقت المغادرة</span>
                <input
                  type="datetime-local"
                  required
                  dir="ltr"
                  value={form.departureDate}
                  onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">عدد المقاعد</span>
                  <input
                    type="number"
                    min={1}
                    required
                    dir="ltr"
                    value={form.seatCapacity}
                    onChange={(e) => setForm({ ...form, seatCapacity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">سعر التذكرة</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    dir="ltr"
                    value={form.basePrice}
                    onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="المركبة (اختياري)" value={form.vehicleId} onChange={(v) => setForm({ ...form, vehicleId: v })} options={vehicles.map((v) => ({ id: v.id, nameAr: v.plateNumber }))} />
                <SelectField label="السائق (اختياري)" value={form.driverId} onChange={(v) => setForm({ ...form, driverId: v })} options={drivers.map((d) => ({ id: d.id, nameAr: d.name }))} />
              </div>

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

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: BranchRef[];
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nameAr}
          </option>
        ))}
      </select>
    </label>
  );
}
