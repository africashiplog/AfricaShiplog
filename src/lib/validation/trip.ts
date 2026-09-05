import { z } from "zod";

export const tripInputSchema = z
  .object({
    vehicleId: z.string().trim().optional().nullable(),
    driverId: z.string().trim().optional().nullable(),
    routeId: z.string().trim().optional().nullable(),
    originBranchId: z.string().trim().min(1, "فرع المغادرة مطلوب"),
    destinationBranchId: z.string().trim().min(1, "فرع الوجهة مطلوب"),
    departureDate: z.coerce.date({ message: "تاريخ ووقت المغادرة غير صالح" }),
    seatCapacity: z.coerce.number().int().min(1, "عدد المقاعد يجب أن يكون 1 على الأقل").max(200),
    basePrice: z.coerce.number().min(0, "السعر غير صالح"),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.originBranchId !== data.destinationBranchId, {
    message: "فرع المغادرة والوجهة يجب أن يكونا مختلفين",
    path: ["destinationBranchId"],
  });

export type TripInput = z.infer<typeof tripInputSchema>;

export const tripUpdateSchema = z.object({
  vehicleId: z.string().trim().optional().nullable(),
  driverId: z.string().trim().optional().nullable(),
  departureDate: z.coerce.date().optional(),
  basePrice: z.coerce.number().min(0).optional(),
  notes: z.string().trim().optional().nullable(),
});
