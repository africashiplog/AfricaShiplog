import { z } from "zod";

export const vehicleInputSchema = z.object({
  plateNumber: z.string().trim().min(1, "رقم اللوحة مطلوب"),
  type: z.string().trim().optional().nullable(),
  capacitySeats: z.coerce.number().int().min(1, "عدد المقاعد يجب أن يكون 1 على الأقل"),
  branchId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().optional().nullable(),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;
