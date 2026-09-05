import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class CashRegisterServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function listRegistersForBranch(branchId: string) {
  return prisma.cashRegister.findMany({
    where: { branchId, isActive: true },
    include: { sessions: { where: { status: "OPEN" }, take: 1 } },
    orderBy: { code: "asc" },
  });
}

/** Returns the branch's single open session, if any — used to attach cash transactions to it. */
export async function getOpenSessionForBranch(branchId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: { status: "OPEN", cashRegister: { branchId } },
    orderBy: { openedAt: "desc" },
  });
}

export async function openSession(cashRegisterId: string, userId: string, openingBalance: number) {
  const register = await prisma.cashRegister.findUnique({ where: { id: cashRegisterId } });
  if (!register || !register.isActive) throw new CashRegisterServiceError("الصندوق غير موجود", 404);

  const existingOpen = await prisma.cashRegisterSession.findFirst({
    where: { cashRegisterId, status: "OPEN" },
  });
  if (existingOpen) throw new CashRegisterServiceError("الصندوق مفتوح بالفعل", 409);

  return prisma.cashRegisterSession.create({
    data: { cashRegisterId, openedById: userId, openingBalance },
  });
}

/**
 * Enforces "no cash transaction without an open register": called wherever a
 * CASH-method payment is about to be recorded (ticket sale, parcel fee/COD,
 * expense). Non-cash methods (card, bank transfer, ...) don't require a
 * physical register session and pass through with `null`.
 */
export async function resolveCashSessionForPayment(
  branchId: string,
  paymentMethodRequiresCashRegister: boolean
): Promise<string | null> {
  if (!paymentMethodRequiresCashRegister) return null;

  const session = await getOpenSessionForBranch(branchId);
  if (!session) {
    throw new CashRegisterServiceError(
      "لا يوجد صندوق نقدي مفتوح لهذا الفرع. يرجى فتح الصندوق أولًا قبل تحصيل مبالغ نقدية",
      409
    );
  }
  return session.id;
}

export function getSession(sessionId: string) {
  return prisma.cashRegisterSession.findUnique({
    where: { id: sessionId },
    include: { cashRegister: { include: { branch: { select: { id: true, nameAr: true } } } }, closing: true },
  });
}

export function listSessionsForBranch(branchId: string) {
  return prisma.cashRegisterSession.findMany({
    where: { cashRegister: { branchId } },
    include: { closing: true, cashRegister: true },
    orderBy: { openedAt: "desc" },
    take: 50,
  });
}

interface SessionSummary {
  ticketRevenue: Prisma.Decimal;
  parcelRevenue: Prisma.Decimal;
  codRevenue: Prisma.Decimal;
  expensesTotal: Prisma.Decimal;
  refundsTotal: Prisma.Decimal;
  revenueByMethod: Record<string, string>;
  expectedCash: Prisma.Decimal;
}

/** Computes the closing summary from the session's actual FinancialTransaction rows — never from client input. */
export async function computeSessionSummary(sessionId: string): Promise<SessionSummary> {
  const session = await prisma.cashRegisterSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new CashRegisterServiceError("الجلسة غير موجودة", 404);

  const transactions = await prisma.financialTransaction.findMany({
    where: { cashRegisterSessionId: sessionId },
    include: { paymentMethod: true },
  });

  let ticketRevenue = new Prisma.Decimal(0);
  let parcelRevenue = new Prisma.Decimal(0);
  let codRevenue = new Prisma.Decimal(0);
  let expensesTotal = new Prisma.Decimal(0);
  let refundsTotal = new Prisma.Decimal(0);
  const byMethod: Record<string, Prisma.Decimal> = {};
  let expectedCash = new Prisma.Decimal(session.openingBalance);

  const OUTFLOW = new Set(["EXPENSE", "REFUND", "WITHDRAWAL"]);

  for (const tx of transactions) {
    const amount = new Prisma.Decimal(tx.amount);
    const isCash = tx.paymentMethod.code === "CASH";
    const signed = OUTFLOW.has(tx.type) ? amount.neg() : amount;

    if (isCash) expectedCash = expectedCash.plus(signed);

    const methodKey = tx.paymentMethod.code;
    byMethod[methodKey] = (byMethod[methodKey] ?? new Prisma.Decimal(0)).plus(signed);

    switch (tx.type) {
      case "TICKET_SALE":
        ticketRevenue = ticketRevenue.plus(amount);
        break;
      case "PARCEL_FEE":
        parcelRevenue = parcelRevenue.plus(amount);
        break;
      case "COD_COLLECTION":
        codRevenue = codRevenue.plus(amount);
        break;
      case "EXPENSE":
        expensesTotal = expensesTotal.plus(amount);
        break;
      case "REFUND":
        refundsTotal = refundsTotal.plus(amount);
        break;
    }
  }

  const revenueByMethod = Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, v.toString()]));

  return { ticketRevenue, parcelRevenue, codRevenue, expensesTotal, refundsTotal, revenueByMethod, expectedCash };
}

export async function closeSession(
  sessionId: string,
  actorId: string,
  actualCash: number,
  differenceReason: string | null
) {
  const session = await prisma.cashRegisterSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new CashRegisterServiceError("الجلسة غير موجودة", 404);
  if (session.status !== "OPEN") throw new CashRegisterServiceError("هذه الجلسة ليست مفتوحة", 400);

  const summary = await computeSessionSummary(sessionId);
  const actual = new Prisma.Decimal(actualCash);
  const differenceAmount = actual.minus(summary.expectedCash);

  if (!differenceAmount.isZero() && !differenceReason) {
    throw new CashRegisterServiceError("يوجد فرق في الرصيد — يجب إدخال سبب الفرق", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.cashRegisterSession.update({ where: { id: sessionId }, data: { status: "CLOSED", closedById: actorId, closedAt: new Date() } });

    return tx.cashRegisterClosing.upsert({
      where: { sessionId },
      create: {
        sessionId,
        closedById: actorId,
        ticketRevenue: summary.ticketRevenue,
        parcelRevenue: summary.parcelRevenue,
        codRevenue: summary.codRevenue,
        expensesTotal: summary.expensesTotal,
        refundsTotal: summary.refundsTotal,
        revenueByMethod: summary.revenueByMethod,
        expectedCash: summary.expectedCash,
        actualCash: actual,
        differenceAmount,
        differenceReason,
      },
      update: {
        closedById: actorId,
        closedAt: new Date(),
        ticketRevenue: summary.ticketRevenue,
        parcelRevenue: summary.parcelRevenue,
        codRevenue: summary.codRevenue,
        expensesTotal: summary.expensesTotal,
        refundsTotal: summary.refundsTotal,
        revenueByMethod: summary.revenueByMethod,
        expectedCash: summary.expectedCash,
        actualCash: actual,
        differenceAmount,
        differenceReason,
        reopenedAt: null,
        reopenedById: null,
        reopenReason: null,
      },
    });
  });
}

export async function reopenSession(sessionId: string, actorId: string, reason: string) {
  const session = await prisma.cashRegisterSession.findUnique({ where: { id: sessionId }, include: { closing: true } });
  if (!session) throw new CashRegisterServiceError("الجلسة غير موجودة", 404);
  if (session.status !== "CLOSED") throw new CashRegisterServiceError("هذه الجلسة ليست مغلقة", 400);
  if (!session.closing) throw new CashRegisterServiceError("لا يوجد إقفال مسجل لهذه الجلسة", 500);

  return prisma.$transaction(async (tx) => {
    await tx.cashRegisterSession.update({ where: { id: sessionId }, data: { status: "REOPENED" } });
    return tx.cashRegisterClosing.update({
      where: { sessionId },
      data: { reopenedAt: new Date(), reopenedById: actorId, reopenReason: reason },
    });
  });
}

/** After corrections, a manager resumes normal operation on the reopened session. */
export async function resumeReopenedSession(sessionId: string) {
  const session = await prisma.cashRegisterSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new CashRegisterServiceError("الجلسة غير موجودة", 404);
  if (session.status !== "REOPENED") throw new CashRegisterServiceError("هذه الجلسة ليست معاد فتحها", 400);
  return prisma.cashRegisterSession.update({ where: { id: sessionId }, data: { status: "OPEN" } });
}
