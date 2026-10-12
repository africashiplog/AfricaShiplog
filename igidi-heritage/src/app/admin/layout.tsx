import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { logoutAction } from "./_actions/auth";

export const metadata: Metadata = { title: { default: "لوحة الإدارة", template: "%s | لوحة الإدارة" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Pages enforce their own capability; this only decides what the menu shows.
  const items = [
    { href: "/admin", label: "لوحة التحكم", show: true },
    { href: "/admin/cemeteries", label: "المدافن", show: true },
    { href: "/admin/people", label: "الأشخاص", show: true },
    { href: "/admin/sources", label: "المصادر والمراجع", show: true },
    { href: "/admin/oral", label: "الروايات الشفوية", show: true },
    { href: "/admin/media", label: "الصور والوثائق", show: true },
    { href: "/admin/taxonomy", label: "المناطق والفترات والأسر", show: true },
    { href: "/admin/data", label: "الاستيراد والتصدير والنسخ الاحتياطي", show: !!user && can(user.role, "data.export") },
    { href: "/admin/revisions", label: "سجل التعديلات", show: true },
    { href: "/admin/users", label: "المستخدمون والصلاحيات", show: !!user && can(user.role, "users.manage") },
    { href: "/admin/settings", label: "الإعدادات", show: !!user && can(user.role, "settings.manage") },
    { href: "/admin/guide", label: "دليل الاستخدام", show: true },
  ];
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-ink text-white lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-2 p-4">
          <Link href="/admin" className="font-display text-lg text-gold-light">۞ إدارة المحتوى</Link>
          <Link href="/" className="text-xs text-white/60 hover:text-gold-light">الموقع العام ↗</Link>
        </div>
        <div className="gold-rule" />
        {user ? (
          <>
            <details className="lg:hidden" open={false}>
              <summary className="cursor-pointer px-4 py-2 text-sm text-white/80">☰ القائمة</summary>
              <AdminNav items={items} />
            </details>
            <div className="hidden lg:block"><AdminNav items={items} /></div>
            <div className="border-t border-white/10 p-4 text-xs text-white/70">
              <p className="font-semibold text-white">{user.name}</p>
              <p>{ROLE_LABELS[user.role]}</p>
              <div className="mt-2 flex gap-3">
                <Link href="/admin/account" className="hover:text-gold-light">حسابي</Link>
                <form action={logoutAction}><button className="hover:text-gold-light">خروج</button></form>
              </div>
            </div>
          </>
        ) : null}
      </aside>
      <div className="min-w-0 flex-1 bg-parchment">{children}</div>
    </div>
  );
}

function AdminNav({ items }: { items: Array<{ href: string; label: string; show: boolean }> }) {
  return (
    <nav className="p-2 text-sm" aria-label="قائمة الإدارة">
      {items.filter((i) => i.show).map((i) => (
        <Link key={i.href} href={i.href} className="block rounded px-3 py-2 text-white/85 hover:bg-white/10 hover:text-gold-light">{i.label}</Link>
      ))}
    </nav>
  );
}
