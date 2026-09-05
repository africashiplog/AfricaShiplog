import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface MonthlyCollectionSummary {
  periodLabel: string;
  ticketRevenue: string;
  parcelRevenue: string;
  totalRevenue: string;
  expensesTotal: string;
  netResult: string;
  marginPercent: string;
  expensesByCategory: { categoryNameAr: string; amount: string; count: number }[];
}

/** period: {year, month} for a calendar month, or {year} alone for the whole year. */
export async function getCollectionSummary(period: { year: number; month?: number }, branchId?: string): Promise<MonthlyCollectionSummary> {
  const start = new Date(Date.UTC(period.year, period.month !== undefined ? period.month - 1 : 0, 1));
  const end = period.month !== undefined ? new Date(Date.UTC(period.year, period.month, 1)) : new Date(Date.UTC(period.year + 1, 0, 1));

  const [transactions, expenses] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { occurredAt: { gte: start, lt: end }, ...(branchId ? { branchId } : {}) },
      select: { type: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { occurredAt: { gte: start, lt: end }, voidedAt: null, ...(branchId ? { branchId } : {}) },
      include: { category: true },
    }),
  ]);

  let ticketRevenue = new Prisma.Decimal(0);
  let parcelRevenue = new Prisma.Decimal(0);
  for (const t of transactions) {
    const amount = new Prisma.Decimal(t.amount);
    if (t.type === "TICKET_SALE") ticketRevenue = ticketRevenue.plus(amount);
    if (t.type === "PARCEL_FEE" || t.type === "COD_COLLECTION") parcelRevenue = parcelRevenue.plus(amount);
  }
  const totalRevenue = ticketRevenue.plus(parcelRevenue);

  const byCategory = new Map<string, { amount: Prisma.Decimal; count: number }>();
  let expensesTotal = new Prisma.Decimal(0);
  for (const e of expenses) {
    const amount = new Prisma.Decimal(e.amount);
    expensesTotal = expensesTotal.plus(amount);
    const key = e.category.nameAr;
    const bucket = byCategory.get(key) ?? { amount: new Prisma.Decimal(0), count: 0 };
    bucket.amount = bucket.amount.plus(amount);
    bucket.count += 1;
    byCategory.set(key, bucket);
  }

  const netResult = totalRevenue.minus(expensesTotal);
  const marginPercent = totalRevenue.isZero() ? new Prisma.Decimal(0) : netResult.dividedBy(totalRevenue).times(100);

  const periodLabel =
    period.month !== undefined
      ? new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleDateString("ar", { month: "long", year: "numeric", timeZone: "UTC" })
      : String(period.year);

  return {
    periodLabel,
    ticketRevenue: ticketRevenue.toString(),
    parcelRevenue: parcelRevenue.toString(),
    totalRevenue: totalRevenue.toString(),
    expensesTotal: expensesTotal.toString(),
    netResult: netResult.toString(),
    marginPercent: marginPercent.toFixed(0),
    expensesByCategory: Array.from(byCategory.entries())
      .map(([categoryNameAr, v]) => ({ categoryNameAr, amount: v.amount.toString(), count: v.count }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
  };
}

export interface TripProfitabilityRow {
  tripId: string;
  tripNumber: string;
  departureDate: string;
  originBranchNameAr: string;
  destinationBranchNameAr: string;
  ticketRevenue: string;
  linkedExpenses: string;
  netResult: string;
}

/** Real per-trip profitability — only possible because expenses can be explicitly linked to a trip (Expense.tripId). */
export async function getTripProfitability(filters: { branchId?: string; dateFrom?: Date; dateTo?: Date } = {}): Promise<TripProfitabilityRow[]> {
  const trips = await prisma.trip.findMany({
    where: {
      deletedAt: null,
      ...(filters.branchId ? { originBranchId: filters.branchId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            departureDate: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    include: {
      originBranch: { select: { nameAr: true } },
      destinationBranch: { select: { nameAr: true } },
      tickets: { where: { status: { not: "CANCELLED" } }, select: { amountPaid: true } },
      expenses: { where: { voidedAt: null }, select: { amount: true } },
    },
    orderBy: { departureDate: "desc" },
    take: 500,
  });

  return trips.map((t) => {
    const ticketRevenue = t.tickets.reduce((sum, tk) => sum.plus(tk.amountPaid), new Prisma.Decimal(0));
    const linkedExpenses = t.expenses.reduce((sum, e) => sum.plus(e.amount), new Prisma.Decimal(0));
    return {
      tripId: t.id,
      tripNumber: t.tripNumber,
      departureDate: t.departureDate.toISOString(),
      originBranchNameAr: t.originBranch.nameAr,
      destinationBranchNameAr: t.destinationBranch.nameAr,
      ticketRevenue: ticketRevenue.toString(),
      linkedExpenses: linkedExpenses.toString(),
      netResult: ticketRevenue.minus(linkedExpenses).toString(),
    };
  });
}
