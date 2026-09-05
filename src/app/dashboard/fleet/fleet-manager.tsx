"use client";

import { useState } from "react";

interface BranchRef {
  id: string;
  nameAr: string;
}
interface Vehicle {
  id: string;
  plateNumber: string;
  type: string | null;
  capacitySeats: number;
  isActive: boolean;
  branch: BranchRef | null;
}
interface Driver {
  id: string;
  name: string;
  phone: string | null;
  licenseNumber: string | null;
  isActive: boolean;
  branch: BranchRef | null;
}

export default function FleetManager({
  initialVehicles,
  initialDrivers,
  branches,
}: {
  initialVehicles: Vehicle[];
  initialDrivers: Driver[];
  branches: BranchRef[];
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [drivers, setDrivers] = useState(initialDrivers);

  const [vForm, setVForm] = useState({ plateNumber: "", type: "", capacitySeats: "45", branchId: "" });
  const [dForm, setDForm] = useState({ name: "", phone: "", licenseNumber: "", branchId: "" });
  const [vError, setVError] = useState<string | null>(null);
  const [dError, setDError] = useState<string | null>(null);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setVError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...vForm, branchId: vForm.branchId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setVError(data.message ?? "حدث خطأ ما");
      return;
    }
    setVehicles((prev) => [...prev, data.vehicle]);
    setVForm({ plateNumber: "", type: "", capacitySeats: "45", branchId: "" });
  }

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setDError(null);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dForm, branchId: dForm.branchId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDError(data.message ?? "حدث خطأ ما");
      return;
    }
    setDrivers((prev) => [...prev, data.driver]);
    setDForm({ name: "", phone: "", licenseNumber: "", branchId: "" });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-900">المركبات والسائقون</h1>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">المركبات</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">رقم اللوحة</th>
                <th className="px-4 py-3 text-start font-medium">النوع</th>
                <th className="px-4 py-3 text-start font-medium">السعة</th>
                <th className="px-4 py-3 text-start font-medium">الفرع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="ltr-nums px-4 py-3 font-mono text-xs">{v.plateNumber}</td>
                  <td className="px-4 py-3">{v.type ?? "—"}</td>
                  <td className="ltr-nums px-4 py-3">{v.capacitySeats}</td>
                  <td className="px-4 py-3">{v.branch?.nameAr ?? "—"}</td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    لا توجد مركبات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form onSubmit={addVehicle} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <MiniField label="رقم اللوحة" value={vForm.plateNumber} onChange={(v) => setVForm({ ...vForm, plateNumber: v })} dir="ltr" required />
          <MiniField label="النوع" value={vForm.type} onChange={(v) => setVForm({ ...vForm, type: v })} />
          <MiniField label="السعة" value={vForm.capacitySeats} onChange={(v) => setVForm({ ...vForm, capacitySeats: v })} type="number" dir="ltr" required />
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">الفرع</span>
            <select value={vForm.branchId} onChange={(e) => setVForm({ ...vForm, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + إضافة مركبة
          </button>
          {vError && <p className="w-full text-sm text-danger">{vError}</p>}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">السائقون</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">الاسم</th>
                <th className="px-4 py-3 text-start font-medium">الهاتف</th>
                <th className="px-4 py-3 text-start font-medium">رقم الرخصة</th>
                <th className="px-4 py-3 text-start font-medium">الفرع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.name}</td>
                  <td className="ltr-nums px-4 py-3">{d.phone ?? "—"}</td>
                  <td className="ltr-nums px-4 py-3">{d.licenseNumber ?? "—"}</td>
                  <td className="px-4 py-3">{d.branch?.nameAr ?? "—"}</td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    لا يوجد سائقون بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form onSubmit={addDriver} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <MiniField label="الاسم" value={dForm.name} onChange={(v) => setDForm({ ...dForm, name: v })} required />
          <MiniField label="الهاتف" value={dForm.phone} onChange={(v) => setDForm({ ...dForm, phone: v })} dir="ltr" />
          <MiniField label="رقم الرخصة" value={dForm.licenseNumber} onChange={(v) => setDForm({ ...dForm, licenseNumber: v })} dir="ltr" />
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">الفرع</span>
            <select value={dForm.branchId} onChange={(e) => setDForm({ ...dForm, branchId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + إضافة سائق
          </button>
          {dError && <p className="w-full text-sm text-danger">{dError}</p>}
        </form>
      </section>
    </div>
  );
}

function MiniField({
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
    <label className="text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        required={required}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
