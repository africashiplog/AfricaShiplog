import { z } from "zod";

export const createParcelSchema = z.object({
  senderName: z.string().trim().min(1, "اسم المرسل مطلوب"),
  senderPhone: z.string().trim().min(6, "رقم هاتف المرسل غير صالح"),
  senderAddress: z.string().trim().optional().nullable(),
  recipientName: z.string().trim().min(1, "اسم المستلم مطلوب"),
  recipientPhone: z.string().trim().min(6, "رقم هاتف المستلم غير صالح"),
  recipientAddress: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  piecesCount: z.coerce.number().int().min(1).default(1),
  weightKg: z.coerce.number().min(0).optional().nullable(),
  lengthCm: z.coerce.number().min(0).optional().nullable(),
  widthCm: z.coerce.number().min(0).optional().nullable(),
  heightCm: z.coerce.number().min(0).optional().nullable(),
  serviceType: z.string().trim().optional().nullable(),
  routeId: z.string().trim().optional().nullable(),
  destinationBranchId: z.string().trim().min(1, "فرع الوجهة مطلوب"),
  shippingPrice: z.coerce.number().min(0, "سعر الشحن غير صالح"),
  discount: z.coerce.number().min(0).default(0),
  amountDueOnDelivery: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethodId: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type CreateParcelInput = z.infer<typeof createParcelSchema>;

export const parcelStatusUpdateSchema = z.object({
  status: z.enum([
    "REGISTERED",
    "PROCESSING",
    "DISPATCHED",
    "IN_TRANSIT",
    "ARRIVED",
    "READY_FOR_PICKUP",
    "RETURNED",
    "LOST",
    "DAMAGED",
  ]),
  note: z.string().trim().optional().nullable(),
});

export const parcelDeliverySchema = z.object({
  recipientName: z.string().trim().min(1, "اسم المستلم مطلوب"),
  recipientPhone: z.string().trim().min(6, "رقم هاتف غير صالح"),
  amountCollected: z.coerce.number().min(0).default(0),
  paymentMethodId: z.string().trim().optional().nullable(),
});

export const cancelParcelSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإلغاء مطلوب"),
});
