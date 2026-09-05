import { z } from "zod";

export const agencySettingsSchema = z.object({
  nameAr: z.string().trim().min(1, "اسم الوكالة مطلوب"),
  name: z.string().trim().optional().nullable(),
  currency: z.string().trim().min(1, "العملة مطلوبة"),
  timezone: z.string().trim().min(1, "المنطقة الزمنية مطلوبة"),
});

export type AgencySettingsInput = z.infer<typeof agencySettingsSchema>;
