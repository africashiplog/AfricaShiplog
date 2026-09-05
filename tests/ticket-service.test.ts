import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createTicket, refundTicket, cancelTicket, TicketServiceError } from "@/services/ticket-service";
import { resetDatabase, createBranch, createPaymentMethods, createUser, openCashSession } from "./helpers";

describe("ticket-service", () => {
  let branchId: string;
  let cashRegisterId: string;
  let cashId: string;
  let userId: string;
  let tripId: string;
  let seatId: string;
  let seatId2: string;

  beforeEach(async () => {
    await resetDatabase();
    const { branch, cashRegister } = await createBranch();
    const { branch: destBranch } = await createBranch("DST");
    const { cash } = await createPaymentMethods();
    const user = await createUser();

    branchId = branch.id;
    cashRegisterId = cashRegister.id;
    cashId = cash.id;
    userId = user.id;

    await openCashSession(cashRegisterId, userId, 0);

    const trip = await prisma.trip.create({
      data: {
        tripNumber: "TRP-TEST-0001",
        originBranchId: branch.id,
        destinationBranchId: destBranch.id,
        departureDate: new Date(),
        seatCapacity: 2,
        basePrice: 1000,
      },
    });
    tripId = trip.id;
    await prisma.seat.createMany({
      data: [
        { tripId, seatNumber: 1 },
        { tripId, seatNumber: 2 },
      ],
    });
    const seats = await prisma.seat.findMany({ where: { tripId }, orderBy: { seatNumber: "asc" } });
    seatId = seats[0].id;
    seatId2 = seats[1].id;
  });

  it("sells a ticket, computes totals server-side, and creates a linked financial transaction", async () => {
    const ticket = await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 100,
      amountPaid: 900,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });

    expect(ticket.totalPrice.toString()).toBe("900");
    expect(ticket.balanceDue.toString()).toBe("0");
    expect(ticket.status).toBe("PAID");

    const transaction = await prisma.financialTransaction.findFirst({ where: { ticketId: ticket.id } });
    expect(transaction).not.toBeNull();
    expect(transaction!.amount.toString()).toBe("900");
    expect(transaction!.type).toBe("TICKET_SALE");
  });

  it("rejects a second sale on an already-booked seat (no double-booking)", async () => {
    await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });

    await expect(
      createTicket({
        tripId,
        seatId,
        passengerName: "Someone Else",
        passengerPhone: "+22200000002",
        discount: 0,
        amountPaid: 1000,
        paymentMethodId: cashId,
        employeeId: userId,
        branchId,
      })
    ).rejects.toThrow(TicketServiceError);

    const seat = await prisma.seat.findUniqueOrThrow({ where: { id: seatId } });
    expect(seat.status).toBe("SOLD");
  });

  it("still allows selling the second seat on the same trip", async () => {
    await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });

    const secondTicket = await createTicket({
      tripId,
      seatId: seatId2,
      passengerName: "Fatima",
      passengerPhone: "+22200000003",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });
    expect(secondTicket.seatId).toBe(seatId2);
  });

  it("refund reverses the seat to AVAILABLE and records a linked REFUND transaction", async () => {
    const ticket = await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });

    const refunded = await refundTicket(ticket.id, "العميل غيّر رأيه", userId);
    expect(refunded.status).toBe("REFUNDED");

    const seat = await prisma.seat.findUniqueOrThrow({ where: { id: seatId } });
    expect(seat.status).toBe("AVAILABLE");

    const refundTx = await prisma.financialTransaction.findFirst({ where: { ticketId: ticket.id, type: "REFUND" } });
    expect(refundTx).not.toBeNull();
    expect(refundTx!.reversalOfId).not.toBeNull();

    // The freed seat can now be resold as a brand-new ticket (this is the whole point of
    // Seat<->Ticket being one-to-many rather than the original one-to-one design).
    const resold = await createTicket({
      tripId,
      seatId,
      passengerName: "New Passenger",
      passengerPhone: "+22200000009",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });
    expect(resold.id).not.toBe(ticket.id);
  });

  it("cancel is rejected once any amount has been paid — refund must be used instead", async () => {
    const ticket = await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 0,
      amountPaid: 500,
      paymentMethodId: cashId,
      employeeId: userId,
      branchId,
    });

    await expect(cancelTicket(ticket.id, "test")).rejects.toThrow(TicketServiceError);
  });

  it("blocks a cash sale when no cash register session is open for the branch", async () => {
    // Close out the currently-open session's DB row directly (simulating "no open session").
    await prisma.cashRegisterSession.updateMany({ where: { cashRegisterId }, data: { status: "CLOSED" } });

    await expect(
      createTicket({
        tripId,
        seatId,
        passengerName: "Ahmed",
        passengerPhone: "+22200000001",
        discount: 0,
        amountPaid: 1000,
        paymentMethodId: cashId,
        employeeId: userId,
        branchId,
      })
    ).rejects.toThrow(TicketServiceError);
  });

  it("does not require a cash register for a non-cash payment method", async () => {
    await prisma.cashRegisterSession.updateMany({ where: { cashRegisterId }, data: { status: "CLOSED" } });
    const card = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "CARD" } });

    const ticket = await createTicket({
      tripId,
      seatId,
      passengerName: "Ahmed",
      passengerPhone: "+22200000001",
      discount: 0,
      amountPaid: 1000,
      paymentMethodId: card.id,
      employeeId: userId,
      branchId,
    });
    expect(ticket.status).toBe("PAID");
  });
});
