import { z } from "zod";

export const createTicketSchema = z.object({
  tripId: z.string().trim().min(1),
  seatId: z.string().trim().min(1),
  passengerName: z.string().trim().min(1, "اسم الراكب مطلوب"),
  passengerPhone: z.string().trim().min(6, "رقم هاتف غير صالح"),
  discount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethodId: z.string().trim().min(1, "طريقة الدفع مطلوبة"),
});

export const cancelTicketSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإلغاء مطلوب"),
});

export const refundTicketSchema = z.object({
  reason: z.string().trim().min(1, "سبب الاسترداد مطلوب"),
});
