import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب"),
  phone: z.string().trim().min(6, "رقم هاتف غير صالح"),
  secondaryPhone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]).optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
