import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { createRoleSchema, updateRoleSchema } from "@/lib/validation/role";

export class RoleServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} as const;

export function listRoles() {
  return prisma.role.findMany({ include: roleInclude, orderBy: { name: "asc" } });
}

export function listPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
}

export function getRole(id: string) {
  return prisma.role.findUnique({ where: { id }, include: roleInclude });
}

export async function createRole(input: z.infer<typeof createRoleSchema>) {
  const existing = await prisma.role.findUnique({ where: { code: input.code } });
  if (existing) throw new RoleServiceError("رمز الدور مستخدم بالفعل", 409);

  if (input.permissionIds.length > 0) {
    const permissions = await prisma.permission.findMany({ where: { id: { in: input.permissionIds } } });
    if (permissions.length !== input.permissionIds.length) throw new RoleServiceError("صلاحية غير صالحة", 400);
  }

  return prisma.role.create({
    data: {
      code: input.code,
      name: input.name,
      nameAr: input.nameAr,
      description: input.description || null,
      isSystem: false,
      permissions: { create: input.permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: roleInclude,
  });
}

export async function updateRole(id: string, input: z.infer<typeof updateRoleSchema>) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new RoleServiceError("الدور غير موجود", 404);

  if (input.permissionIds) {
    const permissions = await prisma.permission.findMany({ where: { id: { in: input.permissionIds } } });
    if (permissions.length !== input.permissionIds.length) throw new RoleServiceError("صلاحية غير صالحة", 400);
  }

  return prisma.$transaction(async (tx) => {
    if (input.permissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (input.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }
    return tx.role.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
      },
      include: roleInclude,
    });
  });
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw new RoleServiceError("الدور غير موجود", 404);
  if (role.isSystem) throw new RoleServiceError("لا يمكن حذف أدوار النظام الأساسية", 400);
  if (role._count.users > 0) throw new RoleServiceError("لا يمكن حذف دور مرتبط بمستخدمين", 409);

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.role.delete({ where: { id } }),
  ]);
}
