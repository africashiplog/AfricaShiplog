import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { NAV_ITEMS } from "@/components/dashboard-nav-config";
import SidebarNav from "@/components/sidebar-nav";
import LogoutButton from "@/components/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || userHasPermission(user, item.permission));

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-64 shrink-0 border-e border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <span className="text-lg font-bold text-brand-dark">أفريكا شيبلوغ</span>
        </div>
        <SidebarNav items={visibleItems} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            {user.roleCodes.length > 0 ? user.roleCodes.join("، ") : "بدون دور"}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{user.fullNameAr ?? user.fullName}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
