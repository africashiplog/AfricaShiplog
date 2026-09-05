import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const INFLOW_TYPES = ["TICKET_SALE", "PARCEL_FEE", "COD_COLLECTION", "DEPOSIT"] as const;

export async function getDashboardKpis(branchId?: string) {
  const today = startOfDay();
  const branchWhere = branchId ? { branchId } : {};
  const branchWhereParcel = branchId ? { OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }] } : {};

  const [revenueAgg, expenseAgg, refundAgg, ticketCountToday, parcelCountToday, parcelsReadyForPickup, delayedParcels, openCashRegisters, closingsToday, whatsappFailures] =
    await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { ...branchWhere, type: { in: [...INFLOW_TYPES] }, occurredAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...branchWhere, type: "EXPENSE", occurredAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { ...branchWhere, type: "REFUND", occurredAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.ticket.count({ where: { ...(branchId ? { originBranchId: branchId } : {}), createdAt: { gte: today }, status: { not: "CANCELLED" } } }),
      prisma.parcel.count({ where: { ...branchWhereParcel, createdAt: { gte: today } } }),
      prisma.parcel.count({ where: { ...branchWhereParcel, status: "READY_FOR_PICKUP" } }),
      prisma.parcel.count({
        where: {
          ...branchWhereParcel,
          status: { in: ["DISPATCHED", "IN_TRANSIT"] },
          createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.cashRegisterSession.count({ where: { status: "OPEN", ...(branchId ? { cashRegister: { branchId } } : {}) } }),
      prisma.cashRegisterClosing.findMany({
        where: { closedAt: { gte: today }, ...(branchId ? { session: { cashRegister: { branchId } } } : {}) },
        select: { differenceAmount: true },
      }),
      prisma.whatsAppMessage.count({ where: { status: "FAILED" } }),
    ]);

  const revenue = new Prisma.Decimal(revenueAgg._sum.amount ?? 0);
  const expenses = new Prisma.Decimal(expenseAgg._sum.amount ?? 0);
  const refunds = new Prisma.Decimal(refundAgg._sum.amount ?? 0);
  const netProfit = revenue.minus(expenses).minus(refunds);

  const cashDifferencesCount = closingsToday.filter((c) => !new Prisma.Decimal(c.differenceAmount).isZero()).length;

  return {
    todayRevenue: revenue.toString(),
    todayExpenses: expenses.toString(),
    todayNetProfit: netProfit.toString(),
    ticketCountToday,
    parcelCountToday,
    parcelsReadyForPickup,
    delayedParcels,
    openCashRegisters,
    closedCashRegistersToday: closingsToday.length,
    cashDifferencesCount,
    whatsappFailures,
  };
}

export async function getRevenueExpenseTrend(days = 14, branchId?: string) {
  const since = startOfDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
  const transactions = await prisma.financialTransaction.findMany({
    where: { ...(branchId ? { branchId } : {}), occurredAt: { gte: since } },
    select: { type: true, amount: true, occurredAt: true },
  });

  const byDay = new Map<string, { revenue: Prisma.Decimal; expenses: Prisma.Decimal }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), { revenue: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) });
  }

  for (const t of transactions) {
    const key = t.occurredAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    const amount = new Prisma.Decimal(t.amount);
    if ((INFLOW_TYPES as readonly string[]).includes(t.type)) bucket.revenue = bucket.revenue.plus(amount);
    if (t.type === "EXPENSE" || t.type === "REFUND") bucket.expenses = bucket.expenses.plus(amount);
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue.toString(),
    expenses: v.expenses.toString(),
    profit: v.revenue.minus(v.expenses).toString(),
  }));
}

export async function getBranchRevenue() {
  const branches = await prisma.branch.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, nameAr: true } });
  const results = await Promise.all(
    branches.map(async (b) => {
      const [revenueAgg, expenseAgg] = await Promise.all([
        prisma.financialTransaction.aggregate({ where: { branchId: b.id, type: { in: [...INFLOW_TYPES] } }, _sum: { amount: true } }),
        prisma.financialTransaction.aggregate({ where: { branchId: b.id, type: "EXPENSE" }, _sum: { amount: true } }),
      ]);
      const revenue = new Prisma.Decimal(revenueAgg._sum.amount ?? 0);
      const expenses = new Prisma.Decimal(expenseAgg._sum.amount ?? 0);
      return { branchName: b.nameAr, revenue: revenue.toString(), expenses: expenses.toString(), net: revenue.minus(expenses).toString() };
    })
  );
  return results;
}

/** Revenue by destination — NOT profit: no per-route cost allocation is configured, so only revenue is shown. */
export async function getDestinationRevenue() {
  const tickets = await prisma.ticket.groupBy({
    by: ["tripId"],
    where: { status: { not: "CANCELLED" } },
    _sum: { amountPaid: true },
  });

  const trips = await prisma.trip.findMany({
    where: { id: { in: tickets.map((t) => t.tripId) } },
    select: { id: true, destinationBranch: { select: { nameAr: true } } },
  });
  const tripDest = new Map(trips.map((t) => [t.id, t.destinationBranch.nameAr]));

  const byDestination = new Map<string, Prisma.Decimal>();
  for (const t of tickets) {
    const dest = tripDest.get(t.tripId) ?? "—";
    byDestination.set(dest, (byDestination.get(dest) ?? new Prisma.Decimal(0)).plus(new Prisma.Decimal(t._sum.amountPaid ?? 0)));
  }

  return Array.from(byDestination.entries())
    .map(([destination, revenue]) => ({ destination, revenue: revenue.toString() }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue));
}

export async function getVolumeTrend(days = 14, branchId?: string) {
  const since = startOfDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
  const [tickets, parcels] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...(branchId ? { originBranchId: branchId } : {}), createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.parcel.findMany({
      where: {
        ...(branchId ? { OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }] } : {}),
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    }),
  ]);

  const byDay = new Map<string, { tickets: number; parcels: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), { tickets: 0, parcels: 0 });
  }
  for (const t of tickets) {
    const bucket = byDay.get(t.createdAt.toISOString().slice(0, 10));
    if (bucket) bucket.tickets++;
  }
  for (const p of parcels) {
    const bucket = byDay.get(p.createdAt.toISOString().slice(0, 10));
    if (bucket) bucket.parcels++;
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
}
