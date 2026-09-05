import { z } from "zod";

export const routeInputSchema = z
  .object({
    originBranchId: z.string().trim().min(1, "فرع المغادرة مطلوب"),
    destinationBranchId: z.string().trim().min(1, "فرع الوصول مطلوب"),
    distanceKm: z.coerce.number().min(0, "المسافة غير صالحة"),
    pricePerPassenger: z.coerce.number().min(0, "سعر المسافر غير صالح"),
    pricePerKg: z.coerce.number().min(0, "سعر الطرد/كغ غير صالح"),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.originBranchId !== data.destinationBranchId, {
    message: "مدينة المغادرة والوصول يجب أن تكونا مختلفتين",
    path: ["destinationBranchId"],
  });

export type RouteInput = z.infer<typeof routeInputSchema>;
