import { prisma } from "@/lib/db";
import type { BranchInput } from "@/lib/validation/branch";

export class BranchServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function listBranches(includeInactive = true) {
  return prisma.branch.findMany({
    where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
  });
}

export function getBranch(id: string) {
  return prisma.branch.findFirst({ where: { id, deletedAt: null } });
}

export async function createBranch(input: BranchInput) {
  const existing = await prisma.branch.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new BranchServiceError("رمز الفرع مستخدم بالفعل", 409);
  }
  return prisma.branch.create({
    data: {
      code: input.code,
      name: input.name,
      nameAr: input.nameAr,
      address: input.address || null,
      city: input.city || null,
      phone: input.phone || null,
      whatsappPhone: input.whatsappPhone || null,
      email: input.email || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateBranch(id: string, input: Partial<BranchInput>) {
  const branch = await getBranch(id);
  if (!branch) throw new BranchServiceError("الفرع غير موجود", 404);

  if (input.code && input.code !== branch.code) {
    const existing = await prisma.branch.findUnique({ where: { code: input.code } });
    if (existing) throw new BranchServiceError("رمز الفرع مستخدم بالفعل", 409);
  }

  return prisma.branch.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.city !== undefined ? { city: input.city || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.whatsappPhone !== undefined ? { whatsappPhone: input.whatsappPhone || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/** Archives (soft-deletes) a branch. Refuses if active users are still assigned to it. */
export async function archiveBranch(id: string) {
  const branch = await getBranch(id);
  if (!branch) throw new BranchServiceError("الفرع غير موجود", 404);

  const assignedUsers = await prisma.user.count({ where: { branchId: id, deletedAt: null } });
  if (assignedUsers > 0) {
    throw new BranchServiceError("لا يمكن أرشفة الفرع لوجود موظفين مرتبطين به. أعد تعيينهم أولًا", 409);
  }

  return prisma.branch.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
