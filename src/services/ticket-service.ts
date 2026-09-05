import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateTicketNumber, generateReferenceNumber, withUniqueRetry } from "@/lib/id-generators";
import { findOrCreateByPhone } from "@/services/customer-service";
import { resolveCashSessionForPayment, CashRegisterServiceError } from "@/services/cash-register-service";

export class TicketServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export interface CreateTicketInput {
  tripId: string;
  seatId: string;
  passengerName: string;
  passengerPhone: string;
  discount: number;
  amountPaid: number;
  paymentMethodId: string;
  employeeId: string;
  branchId: string;
}

const ticketInclude = {
  trip: { include: { originBranch: true, destinationBranch: true } },
  seat: true,
  payments: true,
} as const;

export async function createTicket(input: CreateTicketInput) {
  const trip = await prisma.trip.findFirst({ where: { id: input.tripId, deletedAt: null } });
  if (!trip) throw new TicketServiceError("الرحلة غير موجودة", 404);
  if (trip.status === "CANCELLED" || trip.status === "ARRIVED") {
    throw new TicketServiceError("لا يمكن بيع تذاكر لهذه الرحلة", 400);
  }

  const seat = await prisma.seat.findFirst({ where: { id: input.seatId, tripId: input.tripId } });
  if (!seat) throw new TicketServiceError("المقعد غير موجود في هذه الرحلة", 404);

  const paymentMethod = await prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true } });
  if (!paymentMethod) throw new TicketServiceError("طريقة الدفع غير صالحة", 400);

  const basePrice = new Prisma.Decimal(trip.basePrice);
  const discount = new Prisma.Decimal(input.discount);
  if (discount.gt(basePrice)) throw new TicketServiceError("الخصم أكبر من السعر الأساسي", 400);
  const totalPrice = basePrice.minus(discount);

  const amountPaid = new Prisma.Decimal(input.amountPaid);
  if (amountPaid.gt(totalPrice)) throw new TicketServiceError("المبلغ المدفوع أكبر من السعر الإجمالي", 400);
  const balanceDue = totalPrice.minus(amountPaid);

  let cashRegisterSessionId: string | null = null;
  if (amountPaid.gt(0)) {
    try {
      cashRegisterSessionId = await resolveCashSessionForPayment(input.branchId, paymentMethod.requiresCashRegister);
    } catch (e) {
      if (e instanceof CashRegisterServiceError) throw new TicketServiceError(e.message, e.status);
      throw e;
    }
  }

  const customer = await findOrCreateByPhone(input.passengerName, input.passengerPhone);

  return withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const claim = await tx.seat.updateMany({
        where: { id: input.seatId, tripId: input.tripId, status: "AVAILABLE" },
        data: { status: amountPaid.gte(totalPrice) ? "SOLD" : "RESERVED" },
      });
      if (claim.count !== 1) {
        throw new TicketServiceError("هذا المقعد محجوز بالفعل", 409);
      }

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber: generateTicketNumber(),
          tripId: input.tripId,
          seatId: input.seatId,
          customerId: customer.id,
          passengerName: input.passengerName,
          passengerPhone: input.passengerPhone,
          originBranchId: input.branchId,
          basePrice,
          discount,
          totalPrice,
          amountPaid,
          balanceDue,
          status: balanceDue.lte(0) ? "PAID" : "RESERVED",
          employeeId: input.employeeId,
        },
      });

      if (amountPaid.gt(0)) {
        const payment = await tx.ticketPayment.create({
          data: {
            ticketId: ticket.id,
            amount: amountPaid,
            paymentMethodId: input.paymentMethodId,
            userId: input.employeeId,
          },
        });

        await tx.financialTransaction.create({
          data: {
            referenceNumber: generateReferenceNumber("FIN"),
            type: "TICKET_SALE",
            amount: amountPaid,
            paymentMethodId: input.paymentMethodId,
            branchId: input.branchId,
            cashRegisterSessionId,
            userId: input.employeeId,
            ticketId: ticket.id,
            ticketPaymentId: payment.id,
          },
        });
      }

      return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });
    })
  );
}

export function listTickets(filters: { tripId?: string; branchId?: string; status?: string } = {}) {
  return prisma.ticket.findMany({
    where: {
      ...(filters.tripId ? { tripId: filters.tripId } : {}),
      ...(filters.branchId ? { originBranchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
    },
    include: ticketInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getTicket(id: string) {
  return prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
}

export async function cancelTicket(id: string, reason: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new TicketServiceError("التذكرة غير موجودة", 404);
  if (ticket.status === "CANCELLED" || ticket.status === "REFUNDED" || ticket.status === "USED") {
    throw new TicketServiceError("لا يمكن إلغاء هذه التذكرة في حالتها الحالية", 400);
  }
  if (new Prisma.Decimal(ticket.amountPaid).gt(0)) {
    throw new TicketServiceError("تم دفع مبلغ لهذه التذكرة — استخدم إجراء الاسترداد بدلًا من الإلغاء", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.seat.update({ where: { id: ticket.seatId }, data: { status: "AVAILABLE" } });
    return tx.ticket.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
  });
}

export async function refundTicket(id: string, reason: string, actorId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { financialTransactions: true } });
  if (!ticket) throw new TicketServiceError("التذكرة غير موجودة", 404);
  if (ticket.status !== "PAID" && ticket.status !== "RESERVED") {
    throw new TicketServiceError("لا يمكن استرداد هذه التذكرة في حالتها الحالية", 400);
  }
  const amountPaid = new Prisma.Decimal(ticket.amountPaid);
  if (amountPaid.lte(0)) throw new TicketServiceError("لم يتم دفع أي مبلغ لهذه التذكرة", 400);

  const saleTransaction = ticket.financialTransactions.find((t) => t.type === "TICKET_SALE");
  if (!saleTransaction) throw new TicketServiceError("تعذر العثور على الحركة المالية الأصلية", 500);

  return prisma.$transaction(async (tx) => {
    await tx.seat.update({ where: { id: ticket.seatId }, data: { status: "AVAILABLE" } });

    await tx.financialTransaction.create({
      data: {
        referenceNumber: generateReferenceNumber("REF"),
        type: "REFUND",
        amount: amountPaid,
        paymentMethodId: saleTransaction.paymentMethodId,
        branchId: saleTransaction.branchId,
        cashRegisterSessionId: saleTransaction.cashRegisterSessionId,
        userId: actorId,
        ticketId: ticket.id,
        reversalOfId: saleTransaction.id,
        notes: reason,
      },
    });

    return tx.ticket.update({ where: { id }, data: { status: "REFUNDED", cancelReason: reason } });
  });
}

export async function markTicketUsed(id: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new TicketServiceError("التذكرة غير موجودة", 404);
  if (ticket.status !== "PAID") {
    throw new TicketServiceError("لا يمكن تأكيد الصعود إلا لتذكرة مدفوعة بالكامل", 400);
  }
  return prisma.ticket.update({ where: { id }, data: { status: "USED" } });
}
