import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.string().trim().min(1, "الفئة مطلوبة"),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  paymentMethodId: z.string().trim().min(1, "طريقة الدفع مطلوبة"),
  description: z.string().trim().min(1, "الوصف مطلوب"),
  referenceNumber: z.string().trim().optional().nullable(),
  tripId: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(1, "سبب الإبطال مطلوب"),
});
