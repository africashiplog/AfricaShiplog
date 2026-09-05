import { z } from "zod";

export const closeSessionSchema = z.object({
  actualCash: z.coerce.number().min(0),
  differenceReason: z.string().trim().optional().nullable(),
});

export const reopenSessionSchema = z.object({
  reason: z.string().trim().min(1, "سبب إعادة الفتح مطلوب"),
});
