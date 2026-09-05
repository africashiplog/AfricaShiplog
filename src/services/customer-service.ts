import { prisma } from "@/lib/db";
import type { CustomerInput } from "@/lib/validation/customer";

export class CustomerServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function listCustomers(search?: string) {
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
              { secondaryPhone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function getCustomer(id: string) {
  return prisma.customer.findFirst({ where: { id, deletedAt: null } });
}

export async function getCustomerProfile(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, ticketNumber: true, status: true, totalPrice: true, amountPaid: true, createdAt: true },
      },
      parcelsSent: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, trackingNumber: true, status: true, totalShippingPrice: true, createdAt: true },
      },
      parcelsReceived: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, trackingNumber: true, status: true, amountDueOnDelivery: true, createdAt: true },
      },
    },
  });
  if (!customer) return null;

  const [ticketCount, sentCount, receivedCount] = await Promise.all([
    prisma.ticket.count({ where: { customerId: id } }),
    prisma.parcel.count({ where: { senderCustomerId: id } }),
    prisma.parcel.count({ where: { recipientCustomerId: id } }),
  ]);

  return { customer, ticketCount, sentCount, receivedCount };
}

export async function createCustomer(input: CustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (existing) throw new CustomerServiceError("رقم الهاتف مسجل بالفعل لعميل آخر", 409);

  return prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      secondaryPhone: input.secondaryPhone || null,
      address: input.address || null,
      notes: input.notes || null,
      type: input.type ?? "INDIVIDUAL",
    },
  });
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const customer = await getCustomer(id);
  if (!customer) throw new CustomerServiceError("العميل غير موجود", 404);

  if (input.phone && input.phone !== customer.phone) {
    const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
    if (existing) throw new CustomerServiceError("رقم الهاتف مسجل بالفعل لعميل آخر", 409);
  }

  return prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.secondaryPhone !== undefined ? { secondaryPhone: input.secondaryPhone || null } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
  });
}

export async function archiveCustomer(id: string) {
  const customer = await getCustomer(id);
  if (!customer) throw new CustomerServiceError("العميل غير موجود", 404);
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Used by ticketing/parcel flows to link a walk-in passenger/sender to a Customer record by phone. */
export async function findOrCreateByPhone(name: string, phone: string) {
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) return existing;
  return prisma.customer.create({ data: { name, phone } });
}
