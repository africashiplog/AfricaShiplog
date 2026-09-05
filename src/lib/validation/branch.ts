import { z } from "zod";

export const branchInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "رمز الفرع مطلوب")
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "رمز الفرع يجب أن يتكون من أحرف وأرقام فقط"),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  nameAr: z.string().trim().min(1, "الاسم بالعربية مطلوب"),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  whatsappPhone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type BranchInput = z.infer<typeof branchInputSchema>;
