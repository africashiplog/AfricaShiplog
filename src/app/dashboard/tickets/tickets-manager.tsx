"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

interface TicketRow {
  id: string;
  ticketNumber: string;
  passengerName: string;
  passengerPhone: string;
  totalPrice: string;
  amountPaid: string;
  status: string;
  createdAt: string;
  trip: { id: string; tripNumber: string; destinationBranch: { nameAr: string } };
}

const STATUS_AR: Record<string, string> = {
  RESERVED: "محجوزة",
  PAID: "مدفوعة",
  USED: "مستخدمة",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

export default function TicketsManager({ initialTickets }: { initialTickets: TicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function applyFilter(s: string) {
    setStatus(s);
    setLoading(true);
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = await res.json();
    setLoading(false);
    if (res.ok) setTickets(data.tickets);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">التذاكر</h1>
        <select
          value={status}
          onChange={(e) => applyFilter(e.target.value)}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">لبيع تذكرة جديدة، افتح الرحلة من &quot;إدارة الرحلات&quot; واختر مقعدًا من خريطة المقاعد.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">رقم التذكرة</th>
              <th className="px-4 py-3 text-start font-medium">الراكب</th>
              <th className="px-4 py-3 text-start font-medium">الرحلة</th>
              <th className="px-4 py-3 text-start font-medium">الوجهة</th>
              <th className="px-4 py-3 text-start font-medium">الإجمالي</th>
              <th className="px-4 py-3 text-start font-medium">المدفوع</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className="ltr-nums px-4 py-3 font-mono text-xs">{t.ticketNumber}</td>
                <td className="px-4 py-3">
                  {t.passengerName}
                  <span className="ltr-nums block text-xs text-slate-400">{t.passengerPhone}</span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/trips/${t.trip.id}`} className="ltr-nums font-mono text-xs text-brand hover:underline">
                    {t.trip.tripNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{t.trip.destinationBranch.nameAr}</td>
                <td className="ltr-nums px-4 py-3">{formatMoney(t.totalPrice)}</td>
                <td className="ltr-nums px-4 py-3">{formatMoney(t.amountPaid)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{STATUS_AR[t.status] ?? t.status}</span>
                </td>
                <td className="ltr-nums px-4 py-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleString("ar")}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  لا توجد تذاكر بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
