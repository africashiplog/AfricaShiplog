import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getAgencySettings } from "@/services/agency-settings-service";
import { listUsers } from "@/services/user-service";
import { listBranches } from "@/services/branch-service";
import { listVehicles } from "@/services/vehicle-service";
import { listDrivers } from "@/services/driver-service";
import { listRoutes } from "@/services/route-service";
import { listRoles, listPermissions } from "@/services/role-service";
import { getPublicSettings, listTemplates, listMessages } from "@/services/whatsapp-service";
import { prisma } from "@/lib/db";
import SettingsManager from "./settings-manager";

export const metadata = { title: "الإعدادات | أفريكا شيبلوغ" };

const ANY_PERMISSION = ["settings.manage", "users.manage", "users.view", "branches.manage", "roles.manage", "vehicles.manage", "routes.manage", "whatsapp.manage"];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ANY_PERMISSION.some((p) => userHasPermission(user, p))) redirect("/dashboard");

  const canManageAgency = userHasPermission(user, "settings.manage");
  const canViewUsers = userHasPermission(user, "users.view");
  const canManageFleet = userHasPermission(user, "vehicles.manage");
  const canViewRoutes = userHasPermission(user, "routes.view");
  const canViewBranches = userHasPermission(user, "branches.view");
  const canManageRoles = userHasPermission(user, "roles.manage");
  const canManageWhatsApp = userHasPermission(user, "whatsapp.manage");

  const [agencySettings, users, branchesForUsers, basicRoles, vehicles, drivers, branchesForFleet, routes, branchesForRoutes, allBranches, fullRoles, permissions, waSettings, waTemplates, waMessages] =
    await Promise.all([
      getAgencySettings(),
      canViewUsers ? listUsers() : Promise.resolve(null),
      canViewUsers ? listBranches(false) : Promise.resolve(null),
      canViewUsers ? prisma.role.findMany({ orderBy: { name: "asc" } }) : Promise.resolve(null),
      canManageFleet ? listVehicles() : Promise.resolve(null),
      canManageFleet ? listDrivers() : Promise.resolve(null),
      canManageFleet ? listBranches(false) : Promise.resolve(null),
      canViewRoutes ? listRoutes(true) : Promise.resolve(null),
      canViewRoutes ? listBranches(false) : Promise.resolve(null),
      canViewBranches ? listBranches(true) : Promise.resolve(null),
      canManageRoles ? listRoles() : Promise.resolve(null),
      canManageRoles ? listPermissions() : Promise.resolve(null),
      canManageWhatsApp ? getPublicSettings() : Promise.resolve(null),
      canManageWhatsApp ? listTemplates() : Promise.resolve(null),
      canManageWhatsApp ? listMessages() : Promise.resolve(null),
    ]);

  const usersProps =
    canViewUsers && users && branchesForUsers && basicRoles
      ? {
          initialUsers: JSON.parse(
            JSON.stringify(
              users.map((u) => ({
                id: u.id,
                email: u.email,
                fullName: u.fullName,
                fullNameAr: u.fullNameAr,
                phone: u.phone,
                isActive: u.isActive,
                branch: u.branch,
                roles: u.roles.map((r) => r.role),
              })),
            ),
          ),
          branches: branchesForUsers.map((b) => ({ id: b.id, code: b.code, nameAr: b.nameAr })),
          roles: basicRoles.map((r) => ({ id: r.id, code: r.code, nameAr: r.nameAr })),
          canManage: userHasPermission(user, "users.manage"),
        }
      : null;

  const fleetProps =
    canManageFleet && vehicles && drivers && branchesForFleet
      ? {
          initialVehicles: JSON.parse(JSON.stringify(vehicles)),
          initialDrivers: JSON.parse(JSON.stringify(drivers)),
          branches: branchesForFleet.map((b) => ({ id: b.id, nameAr: b.nameAr })),
        }
      : null;

  const routesProps =
    canViewRoutes && routes && branchesForRoutes
      ? {
          initialRoutes: JSON.parse(JSON.stringify(routes)),
          branches: branchesForRoutes.map((b) => ({ id: b.id, nameAr: b.nameAr })),
          canManage: userHasPermission(user, "routes.manage"),
        }
      : null;

  const branchesProps =
    canViewBranches && allBranches
      ? {
          initialBranches: JSON.parse(JSON.stringify(allBranches)),
          canManage: userHasPermission(user, "branches.manage"),
        }
      : null;

  const rolesProps =
    canManageRoles && fullRoles && permissions
      ? {
          initialRoles: JSON.parse(
            JSON.stringify(
              fullRoles.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameAr: r.nameAr,
                description: r.description,
                isSystem: r.isSystem,
                userCount: r._count.users,
                permissionIds: r.permissions.map((p) => p.permissionId),
              })),
            ),
          ),
          permissions,
        }
      : null;

  const whatsappProps =
    canManageWhatsApp && waSettings && waTemplates && waMessages
      ? {
          initialSettings: JSON.parse(JSON.stringify(waSettings)),
          initialTemplates: waTemplates.map((t) => ({ id: t.id, code: t.code, name: t.name, bodyAr: t.bodyAr })),
          initialMessages: JSON.parse(JSON.stringify(waMessages)),
        }
      : null;

  return (
    <SettingsManager
      agencyProps={{ initialSettings: agencySettings, canManage: canManageAgency }}
      usersProps={usersProps}
      fleetProps={fleetProps}
      routesProps={routesProps}
      branchesProps={branchesProps}
      rolesProps={rolesProps}
      whatsappProps={whatsappProps}
    />
  );
}
