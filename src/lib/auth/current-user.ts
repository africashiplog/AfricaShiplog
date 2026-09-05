import { prisma } from "@/lib/db";
import { getSessionUserId } from "./session";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  fullNameAr: string | null;
  branchId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  roleCodes: string[];
  permissions: Set<string>;
}

/** Loads the full user (roles + effective permissions) for the current request's session cookie. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = new Set<string>();
  const roleCodes: string[] = [];
  for (const userRole of user.roles) {
    roleCodes.push(userRole.role.code);
    for (const rp of userRole.role.permissions) {
      permissions.add(rp.permission.code);
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    fullNameAr: user.fullNameAr,
    branchId: user.branchId,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    roleCodes,
    permissions,
  };
}

/** SUPER_ADMIN bypasses granular permission checks; every other role is checked explicitly. */
export function userHasPermission(user: CurrentUser, code: string): boolean {
  return user.roleCodes.includes("SUPER_ADMIN") || user.permissions.has(code);
}

/** A user with a null branchId has global (all-branch) access; otherwise scoped to their branch. */
export function userCanAccessBranch(user: CurrentUser, branchId: string | null | undefined): boolean {
  if (user.branchId === null) return true;
  if (!branchId) return false;
  return user.branchId === branchId;
}
