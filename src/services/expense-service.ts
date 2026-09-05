import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/id-generators";
import { resolveCashSessionForPayment, CashRegisterServiceError } from "@/services/cash-register-service";
import type { z } from "zod";
import type { createExpenseSchema } from "@/lib/validation/expense";

export class ExpenseServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const expenseInclude = {
  category: true,
  paymentMethod: true,
  user: { select: { id: true, fullName: true, fullNameAr: true } },
  financialTransaction: true,
} as const;

export function listExpenses(filters: { branchId?: string; categoryId?: string } = {}) {
  return prisma.expense.findMany({
    where: {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: expenseInclude,
    orderBy: { occurredAt: "desc" },
    take: 200,
  });
}

export async function createExpense(
  input: z.infer<typeof createExpenseSchema>,
  ctx: { userId: string; branchId: string }
) {
  const category = await prisma.expenseCategory.findFirst({ where: { id: input.categoryId, isActive: true } });
  if (!category) throw new ExpenseServiceError("فئة المصروف غير صالحة", 400);

  const paymentMethod = await prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true } });
  if (!paymentMethod) throw new ExpenseServiceError("طريقة الدفع غير صالحة", 400);

  let cashRegisterSessionId: string | null = null;
  try {
    cashRegisterSessionId = await resolveCashSessionForPayment(ctx.branchId, paymentMethod.requiresCashRegister);
  } catch (e) {
    if (e instanceof CashRegisterServiceError) throw new ExpenseServiceError(e.message, e.status);
    throw e;
  }

  const amount = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        branchId: ctx.branchId,
        categoryId: input.categoryId,
        amount,
        paymentMethodId: input.paymentMethodId,
        cashRegisterSessionId,
        userId: ctx.userId,
        description: input.description,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
      },
    });

    await tx.financialTransaction.create({
      data: {
        referenceNumber: generateReferenceNumber("EXP"),
        type: "EXPENSE",
        amount,
        paymentMethodId: input.paymentMethodId,
        branchId: ctx.branchId,
        cashRegisterSessionId,
        userId: ctx.userId,
        expenseId: expense.id,
      },
    });

    return tx.expense.findUniqueOrThrow({ where: { id: expense.id }, include: expenseInclude });
  });
}

export async function voidExpense(id: string, reason: string, actorId: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: { financialTransaction: true } });
  if (!expense) throw new ExpenseServiceError("المصروف غير موجود", 404);
  if (expense.voidedAt) throw new ExpenseServiceError("تم إبطال هذا المصروف بالفعل", 409);
  if (!expense.financialTransaction) throw new ExpenseServiceError("تعذر العثور على الحركة المالية الأصلية", 500);

  return prisma.$transaction(async (tx) => {
    await tx.financialTransaction.create({
      data: {
        referenceNumber: generateReferenceNumber("ADJ"),
        type: "ADJUSTMENT",
        amount: expense.financialTransaction!.amount,
        paymentMethodId: expense.financialTransaction!.paymentMethodId,
        branchId: expense.financialTransaction!.branchId,
        cashRegisterSessionId: expense.financialTransaction!.cashRegisterSessionId,
        userId: actorId,
        reversalOfId: expense.financialTransaction!.id,
        notes: reason,
      },
    });

    return tx.expense.update({
      where: { id },
      data: { voidedAt: new Date(), voidReason: reason },
      include: expenseInclude,
    });
  });
}

export function listExpenseCategories() {
  return prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}
