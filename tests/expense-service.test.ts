import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createExpense, voidExpense, ExpenseServiceError } from "@/services/expense-service";
import { openSession } from "@/services/cash-register-service";
import { resetDatabase, createBranch, createPaymentMethods, createUser } from "./helpers";

describe("expense-service", () => {
  let branchId: string;
  let cashId: string;
  let userId: string;
  let categoryId: string;

  beforeEach(async () => {
    await resetDatabase();
    const { branch, cashRegister } = await createBranch();
    const { cash } = await createPaymentMethods();
    const user = await createUser();
    const category = await prisma.expenseCategory.create({ data: { code: "RENT", name: "Rent", nameAr: "إيجار" } });

    branchId = branch.id;
    cashId = cash.id;
    userId = user.id;
    categoryId = category.id;

    await openSession(cashRegister.id, userId, 0);
  });

  it("creates an expense with a linked EXPENSE financial transaction", async () => {
    const expense = await createExpense(
      { categoryId, amount: 300, paymentMethodId: cashId, description: "إيجار الشهر" },
      { userId, branchId }
    );
    expect(expense.amount.toString()).toBe("300");

    const tx = await prisma.financialTransaction.findFirst({ where: { expenseId: expense.id } });
    expect(tx).not.toBeNull();
    expect(tx!.type).toBe("EXPENSE");
    expect(tx!.amount.toString()).toBe("300");
  });

  it("voiding creates an ADJUSTMENT reversal and never deletes the original rows", async () => {
    const expense = await createExpense(
      { categoryId, amount: 200, paymentMethodId: cashId, description: "test" },
      { userId, branchId }
    );

    const voided = await voidExpense(expense.id, "تسجيل مكرر بالخطأ", userId);
    expect(voided.voidedAt).not.toBeNull();

    const stillExists = await prisma.expense.findUnique({ where: { id: expense.id } });
    expect(stillExists).not.toBeNull();

    const original = await prisma.financialTransaction.findFirstOrThrow({ where: { expenseId: expense.id } });
    expect(original.amount.toString()).toBe("200"); // untouched

    const reversal = await prisma.financialTransaction.findFirst({ where: { reversalOfId: original.id } });
    expect(reversal).not.toBeNull();
    expect(reversal!.type).toBe("ADJUSTMENT");
    expect(reversal!.amount.toString()).toBe("200");
  });

  it("rejects voiding the same expense twice", async () => {
    const expense = await createExpense(
      { categoryId, amount: 100, paymentMethodId: cashId, description: "test" },
      { userId, branchId }
    );
    await voidExpense(expense.id, "reason 1", userId);
    await expect(voidExpense(expense.id, "reason 2", userId)).rejects.toThrow(ExpenseServiceError);
  });
});
