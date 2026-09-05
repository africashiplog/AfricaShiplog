import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface ReportDateFilter {
  branchId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

function dateRangeWhere(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return {};
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  };
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export interface TicketReportFilter extends ReportDateFilter {
  employeeId?: string;
  destinationBranchId?: string;
  status?: string;
}

export async function ticketReport(filter: TicketReportFilter) {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(filter.branchId ? { originBranchId: filter.branchId } : {}),
      ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(filter.destinationBranchId ? { trip: { destinationBranchId: filter.destinationBranchId } } : {}),
      ...(filter.dateFrom || filter.dateTo ? { createdAt: dateRangeWhere(filter.dateFrom, filter.dateTo) } : {}),
    },
    include: {
      trip: { include: { destinationBranch: { select: { nameAr: true } } } },
      originBranch: { select: { nameAr: true } },
      employee: { select: { fullName: true, fullNameAr: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  let totalRevenue = new Prisma.Decimal(0);
  let cancelledCount = 0;
  let refundedCount = 0;
  let refundedAmount = new Prisma.Decimal(0);

  for (const t of tickets) {
    if (t.status === "CANCELLED") cancelledCount++;
    if (t.status === "REFUNDED") {
      refundedCount++;
      refundedAmount = refundedAmount.plus(t.amountPaid);
    } else {
      totalRevenue = totalRevenue.plus(t.amountPaid);
    }
  }

  return {
    rows: tickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      passengerName: t.passengerName,
      passengerPhone: t.passengerPhone,
      origin: t.originBranch.nameAr,
      destination: t.trip.destinationBranch.nameAr,
      basePrice: t.basePrice.toString(),
      discount: t.discount.toString(),
      totalPrice: t.totalPrice.toString(),
      amountPaid: t.amountPaid.toString(),
      status: t.status,
      employee: t.employee.fullNameAr ?? t.employee.fullName,
      createdAt: t.createdAt.toISOString(),
    })),
    summary: {
      count: tickets.length,
      totalRevenue: totalRevenue.toString(),
      cancelledCount,
      refundedCount,
      refundedAmount: refundedAmount.toString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Parcels
// ---------------------------------------------------------------------------

export interface ParcelReportFilter extends ReportDateFilter {
  status?: string;
}

export async function parcelReport(filter: ParcelReportFilter) {
  const parcels = await prisma.parcel.findMany({
    where: {
      ...(filter.branchId ? { OR: [{ originBranchId: filter.branchId }, { destinationBranchId: filter.branchId }] } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(filter.dateFrom || filter.dateTo ? { createdAt: dateRangeWhere(filter.dateFrom, filter.dateTo) } : {}),
    },
    include: {
      originBranch: { select: { nameAr: true } },
      destinationBranch: { select: { nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const byStatus: Record<string, number> = {};
  let shippingRevenue = new Prisma.Decimal(0);
  let codRevenue = new Prisma.Decimal(0);
  let delayedCount = 0;
  const delayThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const NOT_YET_ARRIVED = new Set(["DISPATCHED", "IN_TRANSIT"]);

  for (const p of parcels) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    shippingRevenue = shippingRevenue.plus(p.totalShippingPrice);
    if (p.status === "DELIVERED" && p.deliveryAmountCollected) {
      codRevenue = codRevenue.plus(p.deliveryAmountCollected);
    }
    if (NOT_YET_ARRIVED.has(p.status) && p.createdAt < delayThreshold) delayedCount++;
  }

  return {
    rows: parcels.map((p) => ({
      trackingNumber: p.trackingNumber,
      sender: p.senderName,
      recipient: p.recipientName,
      origin: p.originBranch.nameAr,
      destination: p.destinationBranch.nameAr,
      status: p.status,
      shippingPrice: p.totalShippingPrice.toString(),
      amountDueOnDelivery: p.amountDueOnDelivery.toString(),
      createdAt: p.createdAt.toISOString(),
      deliveredAt: p.deliveredAt?.toISOString() ?? "",
    })),
    summary: {
      count: parcels.length,
      byStatus,
      shippingRevenue: shippingRevenue.toString(),
      codRevenue: codRevenue.toString(),
      delayedCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Financial
// ---------------------------------------------------------------------------

export interface FinancialReportFilter extends ReportDateFilter {
  type?: string;
  paymentMethodId?: string;
}

export async function financialReport(filter: FinancialReportFilter) {
  const transactions = await prisma.financialTransaction.findMany({
    where: {
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.type ? { type: filter.type as never } : {}),
      ...(filter.paymentMethodId ? { paymentMethodId: filter.paymentMethodId } : {}),
      ...(filter.dateFrom || filter.dateTo ? { occurredAt: dateRangeWhere(filter.dateFrom, filter.dateTo) } : {}),
    },
    include: { paymentMethod: true, branch: { select: { nameAr: true } }, user: { select: { fullName: true, fullNameAr: true } } },
    orderBy: { occurredAt: "desc" },
    take: 5000,
  });

  const INFLOW = new Set(["TICKET_SALE", "PARCEL_FEE", "COD_COLLECTION", "DEPOSIT"]);
  const OUTFLOW = new Set(["EXPENSE", "REFUND", "WITHDRAWAL"]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalExpenses = new Prisma.Decimal(0);
  let totalRefunds = new Prisma.Decimal(0);
  const byMethod: Record<string, Prisma.Decimal> = {};

  for (const t of transactions) {
    const amount = new Prisma.Decimal(t.amount);
    if (INFLOW.has(t.type)) totalRevenue = totalRevenue.plus(amount);
    if (t.type === "EXPENSE") totalExpenses = totalExpenses.plus(amount);
    if (t.type === "REFUND") totalRefunds = totalRefunds.plus(amount);
    byMethod[t.paymentMethod.code] = (byMethod[t.paymentMethod.code] ?? new Prisma.Decimal(0)).plus(
      OUTFLOW.has(t.type) ? amount.neg() : amount
    );
  }

  const netProfit = totalRevenue.minus(totalExpenses).minus(totalRefunds);

  return {
    rows: transactions.map((t) => ({
      referenceNumber: t.referenceNumber,
      type: t.type,
      amount: t.amount.toString(),
      paymentMethod: t.paymentMethod.nameAr,
      branch: t.branch.nameAr,
      user: t.user.fullNameAr ?? t.user.fullName,
      occurredAt: t.occurredAt.toISOString(),
      notes: t.notes ?? "",
    })),
    summary: {
      count: transactions.length,
      totalRevenue: totalRevenue.toString(),
      totalExpenses: totalExpenses.toString(),
      totalRefunds: totalRefunds.toString(),
      netProfit: netProfit.toString(),
      byMethod: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, v.toString()])),
    },
  };
}
