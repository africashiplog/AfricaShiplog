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
