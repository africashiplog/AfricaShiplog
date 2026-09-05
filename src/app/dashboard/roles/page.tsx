import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listRoles, listPermissions } from "@/services/role-service";
import RolesManager from "./roles-manager";

export const metadata = { title: "الأدوار والصلاحيات | أفريكا شيبلوغ" };

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "roles.manage")) redirect("/dashboard");

  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);

  return (
    <RolesManager
      initialRoles={roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        nameAr: r.nameAr,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissionIds: r.permissions.map((p) => p.permissionId),
      }))}
      permissions={permissions}
    />
  );
}
