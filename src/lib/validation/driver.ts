import { z } from "zod";

export const driverInputSchema = z.object({
  name: z.string().trim().min(1, "اسم السائق مطلوب"),
  phone: z.string().trim().optional().nullable(),
  licenseNumber: z.string().trim().optional().nullable(),
  branchId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type DriverInput = z.infer<typeof driverInputSchema>;
