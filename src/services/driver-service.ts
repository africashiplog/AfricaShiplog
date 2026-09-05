import { prisma } from "@/lib/db";
import type { DriverInput } from "@/lib/validation/driver";

export class DriverServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function listDrivers() {
  return prisma.driver.findMany({
    where: { deletedAt: null },
    include: { branch: { select: { id: true, nameAr: true } } },
    orderBy: { name: "asc" },
  });
}

export function getDriver(id: string) {
  return prisma.driver.findFirst({ where: { id, deletedAt: null } });
}

export async function createDriver(input: DriverInput) {
  return prisma.driver.create({
    data: {
      name: input.name,
      phone: input.phone || null,
      licenseNumber: input.licenseNumber || null,
      branchId: input.branchId || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateDriver(id: string, input: Partial<DriverInput>) {
  const driver = await getDriver(id);
  if (!driver) throw new DriverServiceError("السائق غير موجود", 404);
  return prisma.driver.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber || null } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function archiveDriver(id: string) {
  const driver = await getDriver(id);
  if (!driver) throw new DriverServiceError("السائق غير موجود", 404);
  return prisma.driver.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
