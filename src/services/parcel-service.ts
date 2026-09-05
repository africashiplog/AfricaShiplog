import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateTrackingNumber, generateReferenceNumber, withUniqueRetry } from "@/lib/id-generators";
import { findOrCreateByPhone } from "@/services/customer-service";
import { resolveCashSessionForPayment, CashRegisterServiceError } from "@/services/cash-register-service";
import type { CreateParcelInput } from "@/lib/validation/parcel";

export class ParcelServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED", "RETURNED", "LOST"] as const;

const parcelInclude = {
  originBranch: { select: { id: true, nameAr: true } },
  destinationBranch: { select: { id: true, nameAr: true } },
  statusHistory: { orderBy: { createdAt: "desc" as const } },
  payments: true,
  items: true,
} as const;

export interface CreateParcelContext {
  employeeId: string;
  originBranchId: string;
}

export async function createParcel(input: CreateParcelInput, ctx: CreateParcelContext) {
  const destinationBranch = await prisma.branch.findFirst({ where: { id: input.destinationBranchId, deletedAt: null } });
  if (!destinationBranch) throw new ParcelServiceError("فرع الوجهة غير موجود", 404);
  if (destinationBranch.id === ctx.originBranchId) {
    throw new ParcelServiceError("فرع الوجهة يجب أن يختلف عن فرع الاستلام", 400);
  }

  const shippingPrice = new Prisma.Decimal(input.shippingPrice);
  const discount = new Prisma.Decimal(input.discount);
  if (discount.gt(shippingPrice)) throw new ParcelServiceError("الخصم أكبر من سعر الشحن", 400);
  const totalShippingPrice = shippingPrice.minus(discount);

  const amountPaid = new Prisma.Decimal(input.amountPaid);
  if (amountPaid.gt(totalShippingPrice)) throw new ParcelServiceError("المبلغ المدفوع أكبر من سعر الشحن الإجمالي", 400);

  let cashRegisterSessionId: string | null = null;
  if (amountPaid.gt(0)) {
    if (!input.paymentMethodId) throw new ParcelServiceError("طريقة الدفع مطلوبة عند تحصيل مبلغ", 400);
    const paymentMethod = await prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true } });
    if (!paymentMethod) throw new ParcelServiceError("طريقة الدفع غير صالحة", 400);
    try {
      cashRegisterSessionId = await resolveCashSessionForPayment(ctx.originBranchId, paymentMethod.requiresCashRegister);
    } catch (e) {
      if (e instanceof CashRegisterServiceError) throw new ParcelServiceError(e.message, e.status);
      throw e;
    }
  }

  const [senderCustomer, recipientCustomer] = await Promise.all([
    findOrCreateByPhone(input.senderName, input.senderPhone),
    findOrCreateByPhone(input.recipientName, input.recipientPhone),
  ]);

  return withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const parcel = await tx.parcel.create({
        data: {
          trackingNumber: generateTrackingNumber(),
          senderCustomerId: senderCustomer.id,
          senderName: input.senderName,
          senderPhone: input.senderPhone,
          senderAddress: input.senderAddress || null,
          recipientCustomerId: recipientCustomer.id,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          recipientAddress: input.recipientAddress || null,
          description: input.description || null,
          piecesCount: input.piecesCount,
          weightKg: input.weightKg ?? null,
          lengthCm: input.lengthCm ?? null,
          widthCm: input.widthCm ?? null,
          heightCm: input.heightCm ?? null,
          serviceType: input.serviceType || null,
          originBranchId: ctx.originBranchId,
          destinationBranchId: input.destinationBranchId,
          shippingPrice,
          discount,
          totalShippingPrice,
          amountDueOnDelivery: input.amountDueOnDelivery,
          status: "RECEIVED",
          notes: input.notes || null,
          createdById: ctx.employeeId,
        },
      });

      await tx.parcelStatusHistory.create({
        data: {
          parcelId: parcel.id,
          previousStatus: null,
          newStatus: "RECEIVED",
          userId: ctx.employeeId,
          branchId: ctx.originBranchId,
        },
      });

      if (amountPaid.gt(0) && input.paymentMethodId) {
        const payment = await tx.parcelPayment.create({
          data: {
            parcelId: parcel.id,
            type: "SHIPPING_FEE",
            amount: amountPaid,
            paymentMethodId: input.paymentMethodId,
            userId: ctx.employeeId,
          },
        });

        await tx.financialTransaction.create({
          data: {
            referenceNumber: generateReferenceNumber("FIN"),
            type: "PARCEL_FEE",
            amount: amountPaid,
            paymentMethodId: input.paymentMethodId,
            branchId: ctx.originBranchId,
            cashRegisterSessionId,
            userId: ctx.employeeId,
            parcelId: parcel.id,
            parcelPaymentId: payment.id,
          },
        });
      }

      return tx.parcel.findUniqueOrThrow({ where: { id: parcel.id }, include: parcelInclude });
    })
  );
}

export function listParcels(filters: { branchId?: string; status?: string; trackingNumber?: string; search?: string } = {}) {
  return prisma.parcel.findMany({
    where: {
      ...(filters.branchId ? { OR: [{ originBranchId: filters.branchId }, { destinationBranchId: filters.branchId }] } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.trackingNumber ? { trackingNumber: filters.trackingNumber } : {}),
      ...(filters.search
        ? {
            OR: [
              { trackingNumber: { contains: filters.search, mode: "insensitive" as const } },
              { senderName: { contains: filters.search, mode: "insensitive" as const } },
              { recipientName: { contains: filters.search, mode: "insensitive" as const } },
              { senderPhone: { contains: filters.search } },
              { recipientPhone: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: { originBranch: { select: { nameAr: true } }, destinationBranch: { select: { nameAr: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getParcel(id: string) {
  return prisma.parcel.findUnique({ where: { id }, include: parcelInclude });
}

export function getParcelByTrackingNumber(trackingNumber: string) {
  return prisma.parcel.findUnique({ where: { trackingNumber }, include: parcelInclude });
}

export async function updateParcelStatus(
  id: string,
  newStatus: string,
  note: string | null,
  actorId: string,
  branchId: string
) {
  const parcel = await prisma.parcel.findUnique({ where: { id } });
  if (!parcel) throw new ParcelServiceError("الطرد غير موجود", 404);
  if (TERMINAL_STATUSES.includes(parcel.status as (typeof TERMINAL_STATUSES)[number])) {
    throw new ParcelServiceError("لا يمكن تغيير حالة طرد وصل إلى حالة نهائية", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.parcelStatusHistory.create({
      data: {
        parcelId: id,
        previousStatus: parcel.status,
        newStatus: newStatus as never,
        note: note || null,
        userId: actorId,
        branchId,
      },
    });
    return tx.parcel.update({ where: { id }, data: { status: newStatus as never } });
  });
}

export interface DeliverParcelInput {
  recipientName: string;
  recipientPhone: string;
  amountCollected: number;
  paymentMethodId?: string | null;
}

export async function deliverParcel(id: string, input: DeliverParcelInput, actorId: string, branchId: string) {
  const parcel = await prisma.parcel.findUnique({ where: { id } });
  if (!parcel) throw new ParcelServiceError("الطرد غير موجود", 404);
  if (parcel.status === "DELIVERED") throw new ParcelServiceError("تم تسليم هذا الطرد بالفعل", 409);
  if (TERMINAL_STATUSES.includes(parcel.status as (typeof TERMINAL_STATUSES)[number])) {
    throw new ParcelServiceError("لا يمكن تسليم طرد في هذه الحالة", 400);
  }

  const amountDue = new Prisma.Decimal(parcel.amountDueOnDelivery);
  const amountCollected = new Prisma.Decimal(input.amountCollected);
  if (amountDue.gt(0) && !amountCollected.eq(amountDue)) {
    throw new ParcelServiceError(`المبلغ المحصل يجب أن يساوي المبلغ المستحق (${amountDue.toString()})`, 400);
  }

  let cashRegisterSessionId: string | null = null;
  if (amountCollected.gt(0)) {
    if (!input.paymentMethodId) throw new ParcelServiceError("طريقة الدفع مطلوبة عند تحصيل مبلغ", 400);
    const paymentMethod = await prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true } });
    if (!paymentMethod) throw new ParcelServiceError("طريقة الدفع غير صالحة", 400);
    try {
      cashRegisterSessionId = await resolveCashSessionForPayment(branchId, paymentMethod.requiresCashRegister);
    } catch (e) {
      if (e instanceof CashRegisterServiceError) throw new ParcelServiceError(e.message, e.status);
      throw e;
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.parcelStatusHistory.create({
      data: { parcelId: id, previousStatus: parcel.status, newStatus: "DELIVERED", userId: actorId, branchId },
    });

    if (amountCollected.gt(0) && input.paymentMethodId) {
      const payment = await tx.parcelPayment.create({
        data: {
          parcelId: id,
          type: "COD_COLLECTION",
          amount: amountCollected,
          paymentMethodId: input.paymentMethodId,
          userId: actorId,
        },
      });
      await tx.financialTransaction.create({
        data: {
          referenceNumber: generateReferenceNumber("FIN"),
          type: "COD_COLLECTION",
          amount: amountCollected,
          paymentMethodId: input.paymentMethodId,
          branchId,
          cashRegisterSessionId,
          userId: actorId,
          parcelId: id,
          parcelPaymentId: payment.id,
        },
      });
    }

    return tx.parcel.update({
      where: { id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredById: actorId,
        deliveryRecipientName: input.recipientName,
        deliveryRecipientPhone: input.recipientPhone,
        deliveryAmountCollected: amountCollected,
      },
    });
  });
}

export async function cancelParcel(id: string, reason: string, actorId: string, branchId: string) {
  const parcel = await prisma.parcel.findUnique({ where: { id }, include: { payments: true } });
  if (!parcel) throw new ParcelServiceError("الطرد غير موجود", 404);
  if (["DISPATCHED", "IN_TRANSIT", "ARRIVED", "READY_FOR_PICKUP", "DELIVERED"].includes(parcel.status)) {
    throw new ParcelServiceError("لا يمكن إلغاء طرد تم إرساله بالفعل", 400);
  }
  const hasShippingPayment = parcel.payments.some((p) => p.type === "SHIPPING_FEE");
  if (hasShippingPayment) {
    throw new ParcelServiceError("تم تحصيل رسوم شحن لهذا الطرد — استخدم إجراء استرداد رسوم الشحن أولًا", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.parcelStatusHistory.create({
      data: { parcelId: id, previousStatus: parcel.status, newStatus: "CANCELLED", note: reason, userId: actorId, branchId },
    });
    return tx.parcel.update({ where: { id }, data: { status: "CANCELLED" } });
  });
}

export async function refundParcelShippingFee(id: string, reason: string, actorId: string) {
  const parcel = await prisma.parcel.findUnique({ where: { id }, include: { payments: true, financialTransactions: true } });
  if (!parcel) throw new ParcelServiceError("الطرد غير موجود", 404);

  const shippingPayment = parcel.payments.find((p) => p.type === "SHIPPING_FEE");
  if (!shippingPayment) throw new ParcelServiceError("لم يتم تحصيل رسوم شحن لهذا الطرد", 400);

  const saleTransaction = parcel.financialTransactions.find((t) => t.type === "PARCEL_FEE" && t.parcelPaymentId === shippingPayment.id);
  if (!saleTransaction) throw new ParcelServiceError("تعذر العثور على الحركة المالية الأصلية", 500);

  const alreadyRefunded = parcel.financialTransactions.some((t) => t.reversalOfId === saleTransaction.id);
  if (alreadyRefunded) throw new ParcelServiceError("تم استرداد رسوم الشحن لهذا الطرد بالفعل", 409);

  return prisma.$transaction(async (tx) => {
    await tx.financialTransaction.create({
      data: {
        referenceNumber: generateReferenceNumber("REF"),
        type: "REFUND",
        amount: saleTransaction.amount,
        paymentMethodId: saleTransaction.paymentMethodId,
        branchId: saleTransaction.branchId,
        cashRegisterSessionId: saleTransaction.cashRegisterSessionId,
        userId: actorId,
        parcelId: id,
        reversalOfId: saleTransaction.id,
        notes: reason,
      },
    });
    return tx.parcel.update({ where: { id }, data: { status: "CANCELLED" } });
  });
}
