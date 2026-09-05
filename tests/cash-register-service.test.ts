import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { openSession, closeSession, reopenSession, resumeReopenedSession, computeSessionSummary, CashRegisterServiceError } from "@/services/cash-register-service";
import { createTicket } from "@/services/ticket-service";
import { createExpense } from "@/services/expense-service";
import { resetDatabase, createBranch, createPaymentMethods, createUser } from "./helpers";

describe("cash-register-service — daily closing", () => {
  let branchId: string;
  let cashRegisterId: string;
  let cashId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    const { branch, cashRegister } = await createBranch();
    await createPaymentMethods();
    const cash = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "CASH" } });
    const user = await createUser();

    branchId = branch.id;
    cashRegisterId = cashRegister.id;
    cashId = cash.id;
    userId = user.id;
  });

  it("computes expected cash as opening balance plus cash revenue minus cash expenses", async () => {
    const session = await openSession(cashRegisterId, userId, 1000);

    const category = await prisma.expenseCategory.create({ data: { code: "FUEL", name: "Fuel", nameAr: "وقود" } });
    await createExpense(
      { categoryId: category.id, amount: 150, paymentMethodId: cashId, description: "fuel" },
      { userId, branchId }
    );

    const summary = await computeSessionSummary(session.id);
    expect(summary.expectedCash.toString()).toBe("850");
    expect(summary.expensesTotal.toString()).toBe("150");
  });

  it("refuses to open a second session on the same register while one is already open", async () => {
    await openSession(cashRegisterId, userId, 0);
    await expect(openSession(cashRegisterId, userId, 0)).rejects.toThrow(CashRegisterServiceError);
  });

  it("requires a difference reason when actual cash does not match expected, and records it", async () => {
    const session = await openSession(cashRegisterId, userId, 1000);

    await expect(closeSession(session.id, userId, 900, null)).rejects.toThrow(CashRegisterServiceError);

    const closing = await closeSession(session.id, userId, 900, "نقص غير مبرر");
    expect(closing.differenceAmount.toString()).toBe("-100");
    expect(closing.differenceReason).toBe("نقص غير مبرر");

    const closedSession = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(closedSession.status).toBe("CLOSED");
  });

  it("closes cleanly with no reason required when actual matches expected exactly", async () => {
    const session = await openSession(cashRegisterId, userId, 500);
    const closing = await closeSession(session.id, userId, 500, null);
    expect(closing.differenceAmount.toString()).toBe("0");
  });

  it("reopen -> resume round-trip returns the session to OPEN and preserves the closing record", async () => {
    const session = await openSession(cashRegisterId, userId, 500);
    await closeSession(session.id, userId, 500, null);

    const reopened = await reopenSession(session.id, userId, "مراجعة من المحاسب");
    expect(reopened.reopenReason).toBe("مراجعة من المحاسب");
    expect((await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } })).status).toBe("REOPENED");

    await resumeReopenedSession(session.id);
    expect((await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } })).status).toBe("OPEN");
  });

  it("locks a closed session from new cash transactions until reopened+resumed", async () => {
    const session = await openSession(cashRegisterId, userId, 1000);
    await closeSession(session.id, userId, 1000, null);

    const destBranch = await createBranch("DST");
    const trip = await prisma.trip.create({
      data: {
        tripNumber: "TRP-CLOSE-TEST",
        originBranchId: branchId,
        destinationBranchId: destBranch.branch.id,
        departureDate: new Date(),
        seatCapacity: 1,
        basePrice: 100,
      },
    });
    await prisma.seat.create({ data: { tripId: trip.id, seatNumber: 1 } });
    const seat = await prisma.seat.findFirstOrThrow({ where: { tripId: trip.id } });

    await expect(
      createTicket({
        tripId: trip.id,
        seatId: seat.id,
        passengerName: "X",
        passengerPhone: "+22200000001",
        discount: 0,
        amountPaid: 100,
        paymentMethodId: cashId,
        employeeId: userId,
        branchId,
      })
    ).rejects.toThrow(/لا يوجد صندوق نقدي مفتوح/);
  });
});
