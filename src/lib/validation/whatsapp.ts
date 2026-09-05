import { z } from "zod";

export const whatsappSettingsSchema = z.object({
  businessAccountId: z.string().trim().optional().nullable(),
  phoneNumberId: z.string().trim().optional().nullable(),
  accessToken: z.string().trim().optional().nullable(),
  webhookVerifyToken: z.string().trim().optional().nullable(),
});

export const updateTemplateSchema = z.object({
  bodyAr: z.string().trim().min(1, "نص الرسالة مطلوب"),
});
