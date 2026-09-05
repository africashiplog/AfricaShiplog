import { prisma } from "@/lib/db";
import type { RouteInput } from "@/lib/validation/route";

export class RouteServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const routeInclude = {
  originBranch: { select: { id: true, nameAr: true } },
  destinationBranch: { select: { id: true, nameAr: true } },
} as const;

export function listRoutes(includeInactive = true) {
  return prisma.route.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: routeInclude,
    orderBy: [{ originBranch: { nameAr: "asc" } }, { destinationBranch: { nameAr: "asc" } }],
  });
}

export function getRoute(id: string) {
  return prisma.route.findUnique({ where: { id }, include: routeInclude });
}

/** Used by trip/parcel creation to auto-fill destination + price for a given origin/destination pair. */
export function findRouteBetween(originBranchId: string, destinationBranchId: string) {
  return prisma.route.findUnique({
    where: { originBranchId_destinationBranchId: { originBranchId, destinationBranchId } },
  });
}

export async function createRoute(input: RouteInput) {
  const existing = await prisma.route.findUnique({
    where: { originBranchId_destinationBranchId: { originBranchId: input.originBranchId, destinationBranchId: input.destinationBranchId } },
  });
  if (existing) throw new RouteServiceError("يوجد خط بالفعل بين هذين الفرعين", 409);

  return prisma.route.create({
    data: {
      originBranchId: input.originBranchId,
      destinationBranchId: input.destinationBranchId,
      distanceKm: input.distanceKm,
      pricePerPassenger: input.pricePerPassenger,
      pricePerKg: input.pricePerKg,
      isActive: input.isActive ?? true,
    },
    include: routeInclude,
  });
}

export async function updateRoute(id: string, input: Partial<RouteInput>) {
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) throw new RouteServiceError("الخط غير موجود", 404);

  return prisma.route.update({
    where: { id },
    data: {
      ...(input.distanceKm !== undefined ? { distanceKm: input.distanceKm } : {}),
      ...(input.pricePerPassenger !== undefined ? { pricePerPassenger: input.pricePerPassenger } : {}),
      ...(input.pricePerKg !== undefined ? { pricePerKg: input.pricePerKg } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: routeInclude,
  });
}

export async function archiveRoute(id: string) {
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) throw new RouteServiceError("الخط غير موجود", 404);
  return prisma.route.update({ where: { id }, data: { isActive: false } });
}
