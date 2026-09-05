"use client";

import { useState } from "react";

interface Session {
  id: string;
  openingBalance: string;
  openedAt: string;
}
interface Register {
  id: string;
  code: string;
  name: string;
  openSession: Session | null;
}

export default function CashRegistersManager({ initialRegisters, canOpen }: { initialRegisters: Register[]; canOpen: boolean }) {
  const [registers, setRegisters] = useState(initialRegisters);
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);

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
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">الصناديق النقدية</h1>
      <p className="text-sm text-slate-500">
        فتح الصندوق مطلوب قبل تحصيل أي مبلغ نقدي (تذاكر، طرود، مصروفات). شاشة الإقفال اليومي الكاملة (الفرق، السبب، الإغلاق) قادمة في مرحلة لاحقة.
      </p>

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
              <p className="mt-2 text-xs text-slate-500">
                الرصيد الافتتاحي: <span className="ltr-nums">{r.openSession.openingBalance}</span>
              </p>
            ) : (
              canOpen && (
                <div className="mt-3">
                  {openingFor === r.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        dir="ltr"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
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
    </div>
  );
}
