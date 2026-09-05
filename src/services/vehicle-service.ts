import { prisma } from "@/lib/db";
import type { VehicleInput } from "@/lib/validation/vehicle";

export class VehicleServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function listVehicles() {
  return prisma.vehicle.findMany({
    where: { deletedAt: null },
    include: { branch: { select: { id: true, nameAr: true } } },
    orderBy: { plateNumber: "asc" },
  });
}

export function getVehicle(id: string) {
  return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
}

export async function createVehicle(input: VehicleInput) {
  const existing = await prisma.vehicle.findUnique({ where: { plateNumber: input.plateNumber } });
  if (existing) throw new VehicleServiceError("رقم اللوحة مسجل بالفعل", 409);
  return prisma.vehicle.create({
    data: {
      plateNumber: input.plateNumber,
      type: input.type || null,
      capacitySeats: input.capacitySeats,
      branchId: input.branchId || null,
      notes: input.notes || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>) {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new VehicleServiceError("المركبة غير موجودة", 404);
  return prisma.vehicle.update({
    where: { id },
    data: {
      ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
      ...(input.type !== undefined ? { type: input.type || null } : {}),
      ...(input.capacitySeats !== undefined ? { capacitySeats: input.capacitySeats } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function archiveVehicle(id: string) {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new VehicleServiceError("المركبة غير موجودة", 404);
  return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
