import { z } from "zod";

export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "رمز الدور يجب أن يكون بأحرف إنجليزية كبيرة وشرطات سفلية فقط"),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  nameAr: z.string().trim().min(1, "الاسم بالعربية مطلوب"),
  description: z.string().trim().optional().nullable(),
  permissionIds: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nameAr: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  permissionIds: z.array(z.string()).optional(),
});
