import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listUsers } from "@/services/user-service";
import { listBranches } from "@/services/branch-service";
import { prisma } from "@/lib/db";
import UsersManager from "./users-manager";

export const metadata = { title: "المستخدمون | أفريكا شيبلوغ" };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "users.view")) redirect("/dashboard");

  const [users, branches, roles] = await Promise.all([
    listUsers(),
    listBranches(false),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    fullNameAr: u.fullNameAr,
    phone: u.phone,
    isActive: u.isActive,
    branch: u.branch,
    roles: u.roles.map((r) => r.role),
  }));

  return (
    <UsersManager
      initialUsers={serializedUsers}
      branches={branches.map((b) => ({ id: b.id, code: b.code, nameAr: b.nameAr }))}
      roles={roles.map((r) => ({ id: r.id, code: r.code, nameAr: r.nameAr }))}
      canManage={userHasPermission(user, "users.manage")}
    />
  );
}
