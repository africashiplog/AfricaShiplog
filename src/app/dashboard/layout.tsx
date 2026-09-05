import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { NAV_ITEMS } from "@/components/dashboard-nav-config";
import SidebarNav from "@/components/sidebar-nav";
import LogoutButton from "@/components/logout-button";

const ROLE_LABEL_AR: Record<string, string> = {
  SUPER_ADMIN: "مسؤول",
  GENERAL_MANAGER: "مدير عام",
  BRANCH_MANAGER: "مدير فرع",
  TICKET_AGENT: "موظف تذاكر",
  PARCEL_AGENT: "موظف طرود",
  ACCOUNTANT: "محاسب",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      (!item.permission && !item.anyPermission) ||
      (item.permission && userHasPermission(user, item.permission)) ||
      (item.anyPermission && item.anyPermission.some((p) => userHasPermission(user, p)))
  );

  const roleLabel = user.roleCodes.length > 0 ? user.roleCodes.map((r) => ROLE_LABEL_AR[r] ?? r).join("، ") : "بدون دور";
  const initial = (user.fullNameAr ?? user.fullName).trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-text">
        <div className="px-5 py-6">
          <span className="text-lg font-extrabold tracking-wide text-white">أفريكا شيبلوغ</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={visibleItems} />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white">ع</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.fullNameAr ?? user.fullName}</p>
              <p className="truncate text-xs text-sidebar-text">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
