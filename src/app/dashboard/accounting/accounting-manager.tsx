"use client";

import { useState } from "react";
import ExpensesManager from "@/app/dashboard/expenses/expenses-manager";
import CollectionSummaryTab from "./collection-summary-tab";
import TripProfitabilityTab from "./trip-profitability-tab";

type Tab = "expenses" | "collection" | "profitability";

const TAB_LABELS: Record<Tab, string> = {
  expenses: "المصاريف",
  collection: "الحصيلة الشهرية / السنوية",
  profitability: "ربحية كل رحلة",
};

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

export default function AccountingManager({
  initialExpenses,
  categories,
  paymentMethods,
  trips,
  canCreateExpense,
  canApproveExpense,
}: {
  initialExpenses: ExpenseRow[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  trips: TripRef[];
  canCreateExpense: boolean;
  canApproveExpense: boolean;
}) {
  const [tab, setTab] = useState<Tab>("expenses");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => window.print()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          طباعة
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">المحاسبة</h1>
        <p className="text-sm text-slate-500">المصاريف، الحصيلة وربحية الرحلات</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 print:hidden">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "expenses" && (
        <ExpensesManager
          initialExpenses={initialExpenses}
          categories={categories}
          paymentMethods={paymentMethods}
          trips={trips}
          canCreate={canCreateExpense}
          canApprove={canApproveExpense}
        />
      )}
      {tab === "collection" && <CollectionSummaryTab />}
      {tab === "profitability" && <TripProfitabilityTab />}
    </div>
  );
}
