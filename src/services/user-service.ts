import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { z } from "zod";
import type { createUserSchema, updateUserSchema } from "@/lib/validation/user";

export class UserServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

function generateTempPassword() {
  return randomBytes(9).toString("base64url");
}

const userListInclude = {
  branch: { select: { id: true, code: true, nameAr: true } },
  roles: { include: { role: { select: { id: true, code: true, nameAr: true } } } },
} as const;

export function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: userListInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function getUser(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null }, include: userListInclude });
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new UserServiceError("البريد الإلكتروني مستخدم بالفعل", 409);

  const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
  if (roles.length !== input.roleIds.length) throw new UserServiceError("دور غير صالح", 400);

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      fullNameAr: input.fullNameAr || null,
      phone: input.phone || null,
      branchId: input.branchId || null,
      passwordHash,
      mustChangePassword: true,
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
    },
    include: userListInclude,
  });

  return { user, tempPassword };
}

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>) {
  const existing = await getUser(id);
  if (!existing) throw new UserServiceError("المستخدم غير موجود", 404);

  if (input.roleIds) {
    const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
    if (roles.length !== input.roleIds.length) throw new UserServiceError("دور غير صالح", 400);
  }

  return prisma.$transaction(async (tx) => {
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: input.roleIds.map((roleId) => ({ userId: id, roleId })) });
    }

    return tx.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.fullNameAr !== undefined ? { fullNameAr: input.fullNameAr || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: userListInclude,
    });
  });
}

export async function resetUserPassword(id: string) {
  const existing = await getUser(id);
  if (!existing) throw new UserServiceError("المستخدم غير موجود", 404);

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
  return tempPassword;
}

export async function archiveUser(id: string, requestedBy: string) {
  if (id === requestedBy) throw new UserServiceError("لا يمكنك أرشفة حسابك الخاص", 400);
  const existing = await getUser(id);
  if (!existing) throw new UserServiceError("المستخدم غير موجود", 404);

  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
