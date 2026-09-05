"use client";

import { useState } from "react";

interface Closing {
  id: string;
  ticketRevenue: string;
  parcelRevenue: string;
  codRevenue: string;
  expensesTotal: string;
  refundsTotal: string;
  expectedCash: string;
  actualCash: string;
  differenceAmount: string;
  differenceReason: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
}
interface Session {
  id: string;
  openingBalance: string;
  openedAt: string;
  status: "OPEN" | "CLOSED" | "REOPENED";
  closing: Closing | null;
}
interface Register {
  id: string;
  code: string;
  name: string;
  openSession: Session | null;
}

const STATUS_AR: Record<string, string> = { OPEN: "مفتوح", CLOSED: "مغلق", REOPENED: "معاد فتحه" };

export default function CashRegistersManager({
  initialRegisters,
  initialSessions,
  canOpen,
  canClose,
  canReopen,
}: {
  initialRegisters: Register[];
  initialSessions: Session[];
  canOpen: boolean;
  canClose: boolean;
  canReopen: boolean;
}) {
  const [registers, setRegisters] = useState(initialRegisters);
  const sessions = initialSessions;
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingSession, setClosingSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<{ expectedCash: string } | null>(null);
  const [actualCash, setActualCash] = useState("0");
  const [differenceReason, setDifferenceReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refreshAll() {
    window.location.reload();
  }

  async function handleOpen(id: string) {
    setError(null);
    const res = await fetch(`/api/cash-registers/${id}/open-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance: Number(openingBalance) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "تعذر فتح الصندوق");
      return;
    }
    setRegisters((prev) => prev.map((r) => (r.id === id ? { ...r, openSession: data.session } : r)));
    setOpeningFor(null);
    await refreshAll();
  }

  async function startClose(session: Session) {
    setError(null);
    setClosingSession(session);
    setActualCash("0");
    setDifferenceReason("");
    const res = await fetch(`/api/cash-sessions/${session.id}/summary`);
    const data = await res.json();
    if (res.ok) setSummary(data);
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!closingSession) return;
    setError(null);
    const res = await fetch(`/api/cash-sessions/${closingSession.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualCash: Number(actualCash), differenceReason: differenceReason || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "تعذر إغلاق الصندوق");
      return;
    }
    setClosingSession(null);
    await refreshAll();
  }

  async function handleReopen(sessionId: string) {
    const reason = prompt("سبب إعادة الفتح:");
    if (!reason) return;
    const res = await fetch(`/api/cash-sessions/${sessionId}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر إعادة الفتح");
      return;
    }
    await refreshAll();
  }

  async function handleResume(sessionId: string) {
    const res = await fetch(`/api/cash-sessions/${sessionId}/resume`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر الاستئناف");
      return;
    }
    await refreshAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">الصناديق النقدية والإقفال اليومي</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {registers.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{r.name}</h3>
                <p className="ltr-nums text-xs text-slate-400">{r.code}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.openSession ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                {r.openSession ? "مفتوح" : "مغلق"}
              </span>
            </div>
            {r.openSession ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">
                  الرصيد الافتتاحي: <span className="ltr-nums">{r.openSession.openingBalance}</span>
                </p>
                {canClose && (
                  <button onClick={() => startClose(r.openSession!)} className="text-sm text-brand hover:underline">
                    الإقفال اليومي
                  </button>
                )}
              </div>
            ) : (
              canOpen && (
                <div className="mt-3">
                  {openingFor === r.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" dir="ltr" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                      <button onClick={() => handleOpen(r.id)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                        فتح
                      </button>
                      <button onClick={() => setOpeningFor(null)} className="text-xs text-slate-500 hover:underline">
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setOpeningFor(r.id)} className="text-sm text-brand hover:underline">
                      فتح الصندوق
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        ))}
        {registers.length === 0 && <p className="text-sm text-slate-400">لا توجد صناديق لهذا الفرع</p>}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">سجل الجلسات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">تاريخ الفتح</th>
                <th className="px-3 py-2 text-start font-medium">الرصيد الافتتاحي</th>
                <th className="px-3 py-2 text-start font-medium">المتوقع</th>
                <th className="px-3 py-2 text-start font-medium">الفعلي</th>
                <th className="px-3 py-2 text-start font-medium">الفرق</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                {canReopen && <th className="px-3 py-2 text-start font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="ltr-nums px-3 py-2">{new Date(s.openedAt).toLocaleString("ar")}</td>
                  <td className="ltr-nums px-3 py-2">{s.openingBalance}</td>
                  <td className="ltr-nums px-3 py-2">{s.closing?.expectedCash ?? "—"}</td>
                  <td className="ltr-nums px-3 py-2">{s.closing?.actualCash ?? "—"}</td>
                  <td className={`ltr-nums px-3 py-2 ${s.closing && s.closing.differenceAmount !== "0" ? "font-semibold text-danger" : ""}`}>
                    {s.closing?.differenceAmount ?? "—"}
                  </td>
                  <td className="px-3 py-2">{STATUS_AR[s.status]}</td>
                  {canReopen && (
                    <td className="px-3 py-2">
                      {s.status === "CLOSED" && (
                        <button onClick={() => handleReopen(s.id)} className="text-sm text-danger hover:underline">
                          إعادة فتح
                        </button>
                      )}
                      {s.status === "REOPENED" && (
                        <button onClick={() => handleResume(s.id)} className="text-sm text-brand hover:underline">
                          استئناف
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    لا يوجد سجل بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {closingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">الإقفال اليومي</h2>
            {summary ? (
              <form onSubmit={handleClose} className="space-y-3">
                <p className="text-sm text-slate-600">
                  الرصيد النقدي المتوقع: <span className="ltr-nums font-bold">{summary.expectedCash}</span>
                </p>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">الرصيد النقدي الفعلي (بعد العد)</span>
                  <input
                    type="number"
                    dir="ltr"
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                {Number(actualCash) !== Number(summary.expectedCash) && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">سبب الفرق (مطلوب)</span>
                    <textarea
                      required
                      value={differenceReason}
                      onChange={(e) => setDifferenceReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                )}
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setClosingSession(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    إلغاء
                  </button>
                  <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    تأكيد الإغلاق
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-500">جارٍ التحميل...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
