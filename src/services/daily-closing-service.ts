import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export interface EmployeeDailySummary {
  userId: string;
  fullName: string;
  fullNameAr: string | null;
  email: string;
  ticketsCount: number;
  seatsCount: number;
  ticketRevenue: string;
  parcelsCount: number;
  parcelRevenue: string;
  cancelledCount: number;
  totalCollected: string;
}

/**
 * Per-employee daily summary for the "close the register at end of day" screen
 * — distinct from the per-cash-register-session open/close/expected-vs-actual
 * workflow (src/services/cash-register-service.ts), which stays the
 * authoritative record for cash reconciliation. This is a same-day rollup of
 * who sold what, grouped by the employee who processed it.
 */
export async function getDailyClosingSummary(date: Date, branchId?: string): Promise<EmployeeDailySummary[]> {
  const { start, end } = dayRange(date);

  const [tickets, cancelledTickets, parcels, transactions] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: "CANCELLED" },
        ...(branchId ? { originBranchId: branchId } : {}),
      },
      select: { employeeId: true },
    }),
    prisma.ticket.findMany({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: start, lt: end },
        ...(branchId ? { originBranchId: branchId } : {}),
      },
      select: { employeeId: true },
    }),
    prisma.parcel.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        ...(branchId ? { originBranchId: branchId } : {}),
      },
      select: { createdById: true },
    }),
    prisma.financialTransaction.findMany({
      where: {
        occurredAt: { gte: start, lt: end },
        type: { in: ["TICKET_SALE", "PARCEL_FEE", "COD_COLLECTION"] },
        ...(branchId ? { branchId } : {}),
      },
      select: { userId: true, type: true, amount: true },
    }),
  ]);

  const userIds = new Set<string>();
  tickets.forEach((t) => userIds.add(t.employeeId));
  cancelledTickets.forEach((t) => userIds.add(t.employeeId));
  parcels.forEach((p) => userIds.add(p.createdById));
  transactions.forEach((t) => userIds.add(t.userId));

  if (userIds.size === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, fullName: true, fullNameAr: true, email: true },
  });

  return users
    .map((u) => {
      const userTickets = tickets.filter((t) => t.employeeId === u.id).length;
      const userCancelled = cancelledTickets.filter((t) => t.employeeId === u.id).length;
      const userParcels = parcels.filter((p) => p.createdById === u.id).length;
      const ticketRevenue = transactions
        .filter((t) => t.userId === u.id && t.type === "TICKET_SALE")
        .reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));
      const parcelRevenue = transactions
        .filter((t) => t.userId === u.id && (t.type === "PARCEL_FEE" || t.type === "COD_COLLECTION"))
        .reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));

      return {
        userId: u.id,
        fullName: u.fullName,
        fullNameAr: u.fullNameAr,
        email: u.email,
        ticketsCount: userTickets,
        seatsCount: userTickets, // 1 ticket = 1 seat in this system
        ticketRevenue: ticketRevenue.toString(),
        parcelsCount: userParcels,
        parcelRevenue: parcelRevenue.toString(),
        cancelledCount: userCancelled,
        totalCollected: ticketRevenue.plus(parcelRevenue).toString(),
      };
    })
    .sort((a, b) => (a.fullNameAr ?? a.fullName).localeCompare(b.fullNameAr ?? b.fullName));
}
