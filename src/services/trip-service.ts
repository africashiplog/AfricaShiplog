import { prisma } from "@/lib/db";
import { generateTripNumber, withUniqueRetry } from "@/lib/id-generators";
import type { TripInput, tripUpdateSchema } from "@/lib/validation/trip";
import type { z } from "zod";

export class TripServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const tripListInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
  driver: { select: { id: true, name: true } },
  originBranch: { select: { id: true, nameAr: true } },
  destinationBranch: { select: { id: true, nameAr: true } },
  _count: { select: { seats: true, tickets: true } },
} as const;

export function listTrips(filters: { branchId?: string; dateFrom?: Date; dateTo?: Date; status?: string } = {}) {
  return prisma.trip.findMany({
    where: {
      deletedAt: null,
      ...(filters.branchId
        ? { OR: [{ originBranchId: filters.branchId }, { destinationBranchId: filters.branchId }] }
        : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            departureDate: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    include: tripListInclude,
    orderBy: { departureDate: "asc" },
  });
}

export function getTrip(id: string) {
  return prisma.trip.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...tripListInclude,
      seats: {
        orderBy: { seatNumber: "asc" },
        include: {
          tickets: {
            where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
            select: { id: true, ticketNumber: true, passengerName: true, status: true },
            take: 1,
          },
        },
      },
    },
  });
}

export async function createTrip(input: TripInput) {
  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, deletedAt: null } });
    if (!vehicle) throw new TripServiceError("المركبة غير موجودة", 404);
  }
  if (input.driverId) {
    const driver = await prisma.driver.findFirst({ where: { id: input.driverId, deletedAt: null } });
    if (!driver) throw new TripServiceError("السائق غير موجود", 404);
  }

  return withUniqueRetry(() =>
    prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          tripNumber: generateTripNumber(),
          vehicleId: input.vehicleId || null,
          driverId: input.driverId || null,
          originBranchId: input.originBranchId,
          destinationBranchId: input.destinationBranchId,
          departureDate: input.departureDate,
          seatCapacity: input.seatCapacity,
          basePrice: input.basePrice,
          notes: input.notes || null,
        },
      });

      await tx.seat.createMany({
        data: Array.from({ length: input.seatCapacity }, (_, i) => ({
          tripId: trip.id,
          seatNumber: i + 1,
        })),
      });

      return trip;
    })
  );
}

export async function updateTrip(id: string, input: z.infer<typeof tripUpdateSchema>) {
  const trip = await prisma.trip.findFirst({ where: { id, deletedAt: null } });
  if (!trip) throw new TripServiceError("الرحلة غير موجودة", 404);
  if (trip.status === "CANCELLED") throw new TripServiceError("لا يمكن تعديل رحلة ملغاة", 400);

  return prisma.trip.update({
    where: { id },
    data: {
      ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId || null } : {}),
      ...(input.driverId !== undefined ? { driverId: input.driverId || null } : {}),
      ...(input.departureDate !== undefined ? { departureDate: input.departureDate } : {}),
      ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
  });
}

export async function cancelTrip(id: string) {
  const trip = await prisma.trip.findFirst({ where: { id, deletedAt: null } });
  if (!trip) throw new TripServiceError("الرحلة غير موجودة", 404);

  const activeTickets = await prisma.ticket.count({
    where: { tripId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });
  if (activeTickets > 0) {
    throw new TripServiceError("لا يمكن إلغاء الرحلة لوجود تذاكر نشطة عليها. قم بإلغاء التذاكر أو استردادها أولًا", 409);
  }

  return prisma.trip.update({ where: { id }, data: { status: "CANCELLED" } });
}
