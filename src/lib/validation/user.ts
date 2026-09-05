import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().min(1).email(),
  fullName: z.string().trim().min(1, "الاسم مطلوب"),
  fullNameAr: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  branchId: z.string().trim().nullable(),
  roleIds: z.array(z.string()).min(1, "اختر دورًا واحدًا على الأقل"),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  fullNameAr: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  branchId: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).min(1).optional(),
});
