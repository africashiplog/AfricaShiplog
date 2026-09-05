"use client";

import { useState } from "react";

interface TicketRef {
  id: string;
  ticketNumber: string;
  passengerName: string;
  status: string;
}
interface SeatRow {
  id: string;
  seatNumber: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
  tickets: TicketRef[];
}
interface TripDetail {
  id: string;
  tripNumber: string;
  departureDate: string;
  basePrice: string;
  status: string;
  seatCapacity: number;
  originBranch: { nameAr: string };
  destinationBranch: { nameAr: string };
  seats: SeatRow[];
}
interface PaymentMethod {
  id: string;
  code: string;
  nameAr: string;
}

const STATUS_AR: Record<string, string> = {
  RESERVED: "محجوزة",
  PAID: "مدفوعة",
  USED: "مستخدمة",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

const seatColor: Record<string, string> = {
  AVAILABLE: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
  RESERVED: "border-amber-300 bg-amber-50 text-amber-700",
  SOLD: "border-slate-300 bg-slate-100 text-slate-600",
  BLOCKED: "border-slate-200 bg-slate-50 text-slate-300",
};

export default function TripDetailClient({
  initialTrip,
  paymentMethods,
  canSell,
  canCancelTicket,
  canRefund,
  canMarkUsed,
}: {
  initialTrip: TripDetail;
  paymentMethods: PaymentMethod[];
  canSell: boolean;
  canCancelTicket: boolean;
  canRefund: boolean;
  canMarkUsed: boolean;
}) {
  const [trip, setTrip] = useState(initialTrip);
  const [selectedSeat, setSelectedSeat] = useState<SeatRow | null>(null);
  const [form, setForm] = useState({ passengerName: "", passengerPhone: "", discount: "0", amountPaid: "", paymentMethodId: paymentMethods[0]?.id ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshTrip() {
    const res = await fetch(`/api/trips/${trip.id}`);
    if (res.ok) {
      const data = await res.json();
      setTrip(JSON.parse(JSON.stringify(data.trip)));
    }
  }

  function openSeat(seat: SeatRow) {
    setError(null);
    if (seat.status === "AVAILABLE") {
      setForm({ passengerName: "", passengerPhone: "", discount: "0", amountPaid: trip.basePrice, paymentMethodId: paymentMethods[0]?.id ?? "" });
    }
    setSelectedSeat(seat);
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSeat) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id, seatId: selectedSeat.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      setSelectedSeat(null);
      await refreshTrip();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTicketAction(ticketId: string, action: "cancel" | "refund" | "mark-used") {
    let reason = "";
    if (action === "cancel" || action === "refund") {
      const input = prompt(action === "cancel" ? "سبب الإلغاء:" : "سبب الاسترداد:");
      if (!input) return;
      reason = input;
    }
    const res = await fetch(`/api/tickets/${ticketId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "mark-used" ? undefined : JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر تنفيذ الإجراء");
      return;
    }
    setSelectedSeat(null);
    await refreshTrip();
  }

  const activeTicket = selectedSeat?.tickets[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ltr-nums text-xl font-bold text-slate-900">{trip.tripNumber}</h1>
        <p className="text-sm text-slate-500">
          {trip.originBranch.nameAr} ← {trip.destinationBranch.nameAr} ·{" "}
          <span className="ltr-nums">{new Date(trip.departureDate).toLocaleString("ar")}</span> · السعر:{" "}
          <span className="ltr-nums">{trip.basePrice}</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">خريطة المقاعد</h2>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {trip.seats.map((seat) => (
            <button
              key={seat.id}
              onClick={() => openSeat(seat)}
              className={`ltr-nums rounded-lg border px-2 py-3 text-center text-sm font-medium ${seatColor[seat.status]}`}
            >
              {seat.seatNumber}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span>🟩 متاح</span>
          <span>🟨 محجوز</span>
          <span>⬜ مباع/غير متاح</span>
        </div>
      </div>

      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            {selectedSeat.status === "AVAILABLE" ? (
              <>
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                  بيع تذكرة — مقعد <span className="ltr-nums">{selectedSeat.seatNumber}</span>
                </h2>
                {canSell ? (
                  <form onSubmit={handleSell} className="space-y-3">
                    <Field label="اسم الراكب" value={form.passengerName} onChange={(v) => setForm({ ...form, passengerName: v })} required />
                    <Field label="هاتف الراكب" value={form.passengerPhone} onChange={(v) => setForm({ ...form, passengerPhone: v })} dir="ltr" required />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="الخصم" value={form.discount} onChange={(v) => setForm({ ...form, discount: v })} dir="ltr" type="number" />
                      <Field label="المبلغ المدفوع" value={form.amountPaid} onChange={(v) => setForm({ ...form, amountPaid: v })} dir="ltr" type="number" required />
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">طريقة الدفع</span>
                      <select
                        value={form.paymentMethodId}
                        onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      >
                        {paymentMethods.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nameAr}
                          </option>
                        ))}
                      </select>
                    </label>

                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setSelectedSeat(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                        إلغاء
                      </button>
                      <button type="submit" disabled={submitting} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                        {submitting ? "جارٍ الحفظ..." : "بيع التذكرة"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-slate-500">ليس لديك صلاحية بيع التذاكر</p>
                )}
              </>
            ) : (
              <>
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                  مقعد <span className="ltr-nums">{selectedSeat.seatNumber}</span>
                </h2>
                {activeTicket ? (
                  <div className="space-y-3 text-sm">
                    <p>الراكب: {activeTicket.passengerName}</p>
                    <p className="ltr-nums font-mono text-xs text-slate-500">{activeTicket.ticketNumber}</p>
                    <p>الحالة: {STATUS_AR[activeTicket.status] ?? activeTicket.status}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {canMarkUsed && activeTicket.status === "PAID" && (
                        <button onClick={() => handleTicketAction(activeTicket.id, "mark-used")} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                          تأكيد الصعود
                        </button>
                      )}
                      {canRefund && (activeTicket.status === "PAID" || activeTicket.status === "RESERVED") && (
                        <button onClick={() => handleTicketAction(activeTicket.id, "refund")} className="rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50">
                          استرداد
                        </button>
                      )}
                      {canCancelTicket && activeTicket.status === "RESERVED" && (
                        <button onClick={() => handleTicketAction(activeTicket.id, "cancel")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">هذا المقعد غير متاح حاليًا</p>
                )}
                <div className="pt-4 text-end">
                  <button onClick={() => setSelectedSeat(null)} className="text-sm text-slate-500 hover:underline">
                    إغلاق
                  </button>
                </div>
              </>
            )}
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
