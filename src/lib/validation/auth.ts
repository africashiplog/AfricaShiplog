import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "يجب أن تختلف كلمة المرور الجديدة عن الحالية",
    path: ["newPassword"],
  });
